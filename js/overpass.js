/**
 * Live camera fetch via OpenStreetMap Overpass API.
 * Modes: ALPR/Flock-focused vs broader man_made=surveillance (security cameras).
 * Memory-conscious: hard caps, in-memory cache only.
 */

const OverpassCameras = (() => {
  const MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  const CACHE_TTL_MS = 30 * 60 * 1000;
  const MAX_BBOX_AREA = 1.2;
  const MAX_SPAN_DEG = 1.1;
  const MAX_RESULTS = 600;
  const MAX_CACHE_ENTRIES = 16;
  const MAX_CACHE_POINTS = 800;

  /** @type {Map<string, {expires:number, cameras:Array}>} */
  const memCache = new Map();

  let lastStatus = {
    ok: false,
    count: 0,
    source: null,
    error: null,
    fetchedAt: null,
    bounds: null,
    mode: "alpr",
  };

  function getStatus() {
    return { ...lastStatus };
  }

  function padBounds(bounds, padDeg = 0.015) {
    return {
      minLat: bounds.minLat - padDeg,
      maxLat: bounds.maxLat + padDeg,
      minLng: bounds.minLng - padDeg,
      maxLng: bounds.maxLng + padDeg,
    };
  }

  function clampBounds(b) {
    const midLat = (b.minLat + b.maxLat) / 2;
    const midLng = (b.minLng + b.maxLng) / 2;
    let halfLat = Math.abs(b.maxLat - b.minLat) / 2;
    let halfLng = Math.abs(b.maxLng - b.minLng) / 2;
    halfLat = Math.min(halfLat, MAX_SPAN_DEG / 2);
    halfLng = Math.min(halfLng, MAX_SPAN_DEG / 2);
    return {
      minLat: midLat - halfLat,
      maxLat: midLat + halfLat,
      minLng: midLng - halfLng,
      maxLng: midLng + halfLng,
    };
  }

  function bboxArea(b) {
    return Math.abs(b.maxLat - b.minLat) * Math.abs(b.maxLng - b.minLng);
  }

  function cacheKey(b, mode) {
    const q = (n) => (Math.floor(n * 10) / 10).toFixed(1);
    return `${mode}|${q(b.minLat)},${q(b.minLng)},${q(b.maxLat)},${q(b.maxLng)}`;
  }

  function readCache(key) {
    const data = memCache.get(key);
    if (!data) return null;
    if (Date.now() > data.expires) {
      memCache.delete(key);
      return null;
    }
    memCache.delete(key);
    memCache.set(key, data);
    return data.cameras;
  }

  function writeCache(key, cameras) {
    const slim = cameras.slice(0, MAX_CACHE_POINTS).map((c) => ({
      id: c.id,
      lat: c.lat,
      lng: c.lng,
      name: c.name,
      type: c.type,
      category: c.category,
      source: c.source,
      live: true,
      osmId: c.osmId,
      osmType: c.osmType,
      manufacturer: c.manufacturer || "",
      operator: c.operator || "",
      alpr: Boolean(c.alpr),
    }));
    memCache.set(key, { expires: Date.now() + CACHE_TTL_MS, cameras: slim });
    while (memCache.size > MAX_CACHE_ENTRIES) {
      const first = memCache.keys().next().value;
      memCache.delete(first);
    }
  }

  function purgeLegacyLocalStorage() {
    try {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("flock-dodger-osm-alpr:")) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }

  purgeLegacyLocalStorage();

  /**
   * @param {object} b
   * @param {"alpr"|"all"} mode
   */
  function buildQuery(b, mode) {
    const s = b.minLat.toFixed(5);
    const w = b.minLng.toFixed(5);
    const n = b.maxLat.toFixed(5);
    const e = b.maxLng.toFixed(5);
    const bbox = `${s},${w},${n},${e}`;

    // Always pull ALPR / Flock-style tags
    let q = `
[out:json][timeout:22][maxsize:16777216];
(
  node["surveillance:type"="ALPR"](${bbox});
  way["surveillance:type"="ALPR"](${bbox});
  node["surveillance:type"="alpr"](${bbox});
  node["man_made"="surveillance"]["surveillance:type"~"^(ALPR|alpr|ANPR|anpr)$"](${bbox});
  node["camera:type"~"ALPR|alpr|ANPR|anpr"](${bbox});
  node["manufacturer"~"Flock",i](${bbox});
  node["brand"~"Flock",i](${bbox});
`;

    if (mode === "all") {
      // Broader security / CCTV mapping on OSM (can be dense — capped client-side)
      q += `
  node["man_made"="surveillance"](${bbox});
  way["man_made"="surveillance"](${bbox});
  node["surveillance"="public"](${bbox});
  node["surveillance"="outdoor"](${bbox});
  node["surveillance"="camera"](${bbox});
  node["highway"="speed_camera"](${bbox});
`;
    }

    q += `
);
out center tags;
`;
    return q.trim();
  }

  function classifyElement(tags) {
    const blob = Object.entries(tags || {})
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")
      .toLowerCase();

    const isFlock = /flock/.test(blob);
    const isAlpr =
      isFlock ||
      /surveillance:type=(alpr|anpr)/.test(blob) ||
      /camera:type=.*(alpr|anpr)/.test(blob) ||
      /\balpr\b|\banpr\b/.test(blob);

    const isSpeed = /highway=speed_camera|speed.?camera/.test(blob);

    let category = "surveillance";
    let type = tags["surveillance:type"] || tags["camera:type"] || "Camera";

    if (isFlock) {
      category = "alpr";
      type = "Flock";
    } else if (isAlpr) {
      category = "alpr";
      type = tags["surveillance:type"] || tags["camera:type"] || "ALPR";
    } else if (isSpeed) {
      category = "speed";
      type = "Speed camera";
    } else if (tags["man_made"] === "surveillance" || tags.surveillance) {
      category = "surveillance";
      type = tags["surveillance:type"] || tags["camera:type"] || "Security camera";
    }

    return { category, type, alpr: isAlpr || isFlock };
  }

  function elementToCamera(el) {
    const tags = el.tags || {};
    let lat = el.lat;
    let lng = el.lon;
    if (lat == null && el.center) {
      lat = el.center.lat;
      lng = el.center.lon;
    }
    if (lat == null || lng == null) return null;

    const { category, type, alpr } = classifyElement(tags);
    const brand = tags.brand || tags.manufacturer || tags.operator || "";
    const name =
      tags.name ||
      tags["addr:street"] ||
      (brand ? String(brand) : null) ||
      (alpr ? `OSM ALPR #${el.id}` : `OSM camera #${el.id}`);

    return {
      id: `osm-${el.type || "node"}-${el.id}`,
      lat: Number(lat),
      lng: Number(lng),
      name: String(name).slice(0, 120),
      type: String(type),
      category,
      alpr,
      source: "openstreetmap",
      region: "",
      osmId: el.id,
      osmType: el.type || "node",
      manufacturer: (tags.manufacturer || tags.brand || "").slice(0, 80),
      operator: (tags.operator || "").slice(0, 80),
      live: true,
    };
  }

  async function fetchFromMirror(url, query, signal) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal,
    });
    if (!res.ok) {
      const err = new Error(`Overpass HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  /**
   * @param {{minLat,maxLat,minLng,maxLng}} bounds
   * @param {{force?: boolean, signal?: AbortSignal, pad?: number, mode?: "alpr"|"all"}} [opts]
   */
  async function fetchInBounds(bounds, opts = {}) {
    if (!bounds) {
      lastStatus = {
        ok: false,
        count: 0,
        source: null,
        error: "No bounds",
        fetchedAt: null,
        bounds: null,
        mode: opts.mode || "alpr",
      };
      return [];
    }

    const mode = opts.mode === "all" ? "all" : "alpr";
    let b = padBounds(bounds, opts.pad ?? 0.015);
    b = clampBounds(b);
    const area = bboxArea(b);

    if (area > MAX_BBOX_AREA) {
      lastStatus = {
        ok: false,
        count: 0,
        source: null,
        error: "Zoom in for live cameras (area too large for a safe load)",
        fetchedAt: new Date().toISOString(),
        bounds: b,
        mode,
      };
      return [];
    }

    const key = cacheKey(b, mode);
    if (!opts.force) {
      const cached = readCache(key);
      if (cached) {
        lastStatus = {
          ok: true,
          count: cached.length,
          source: "cache",
          error: null,
          fetchedAt: new Date().toISOString(),
          bounds: b,
          mode,
        };
        return cached.slice(0, MAX_RESULTS);
      }
    }

    const query = buildQuery(b, mode);
    let lastErr = null;

    for (const mirror of MIRRORS) {
      try {
        const data = await fetchFromMirror(mirror, query, opts.signal);
        const elements = data.elements || [];
        const cameras = [];
        const seen = new Set();

        // Prefer ALPR/Flock first so cap keeps the most relevant points
        const ranked = elements.slice().sort((a, b) => {
          const ca = classifyElement(a.tags || {});
          const cb = classifyElement(b.tags || {});
          const ra = ca.alpr ? 0 : ca.category === "speed" ? 1 : 2;
          const rb = cb.alpr ? 0 : cb.category === "speed" ? 1 : 2;
          return ra - rb;
        });

        for (const el of ranked) {
          const cam = elementToCamera(el);
          if (!cam) continue;
          if (seen.has(cam.id)) continue;
          seen.add(cam.id);
          cameras.push(cam);
          if (cameras.length >= MAX_RESULTS) break;
        }

        writeCache(key, cameras);
        const alprN = cameras.filter((c) => c.alpr).length;
        lastStatus = {
          ok: true,
          count: cameras.length,
          source: mirror.replace(/^https?:\/\//, "").split("/")[0],
          error: null,
          fetchedAt: new Date().toISOString(),
          bounds: b,
          mode,
          alprCount: alprN,
          otherCount: cameras.length - alprN,
        };
        return cameras;
      } catch (err) {
        if (err.name === "AbortError") throw err;
        lastErr = err;
        console.warn("[Overpass] mirror failed", mirror, err.message);
      }
    }

    lastStatus = {
      ok: false,
      count: 0,
      source: null,
      error: lastErr?.message || "Overpass request failed",
      fetchedAt: new Date().toISOString(),
      bounds: b,
      mode,
    };
    return [];
  }

  function clearCache() {
    memCache.clear();
    purgeLegacyLocalStorage();
  }

  return {
    fetchInBounds,
    getStatus,
    clearCache,
    padBounds,
    clampBounds,
    MAX_RESULTS,
  };
})();
