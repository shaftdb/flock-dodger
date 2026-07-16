/**
 * Live ALPR camera fetch via OpenStreetMap Overpass API.
 * Memory-conscious: hard caps, in-memory cache only (no huge localStorage blobs).
 */

const OverpassCameras = (() => {
  const MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
  const MAX_BBOX_AREA = 1.2; // deg² — ~70 mi box-ish; larger = skip
  const MAX_SPAN_DEG = 1.1; // max side length
  const MAX_RESULTS = 600; // hard cap returned points
  const MAX_CACHE_ENTRIES = 12;
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

  /** Clamp a bbox so it never requests a whole state */
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

  function cacheKey(b) {
    const q = (n) => (Math.floor(n * 10) / 10).toFixed(1);
    return `${q(b.minLat)},${q(b.minLng)},${q(b.maxLat)},${q(b.maxLng)}`;
  }

  function readCache(key) {
    const data = memCache.get(key);
    if (!data) return null;
    if (Date.now() > data.expires) {
      memCache.delete(key);
      return null;
    }
    // LRU touch
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
      source: c.source,
      live: true,
      osmId: c.osmId,
      osmType: c.osmType,
      manufacturer: c.manufacturer || "",
      operator: c.operator || "",
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

  // Run once at load — old builds stuffed multi‑MB camera arrays into localStorage
  purgeLegacyLocalStorage();

  function buildQuery(b) {
    const s = b.minLat.toFixed(5);
    const w = b.minLng.toFixed(5);
    const n = b.maxLat.toFixed(5);
    const e = b.maxLng.toFixed(5);
    const bbox = `${s},${w},${n},${e}`;

    // Keep query tight for speed + smaller payloads
    return `
[out:json][timeout:20][maxsize:16777216];
(
  node["surveillance:type"="ALPR"](${bbox});
  way["surveillance:type"="ALPR"](${bbox});
  node["man_made"="surveillance"]["surveillance:type"~"^(ALPR|alpr|ANPR|anpr)$"](${bbox});
  node["manufacturer"~"Flock",i](${bbox});
  node["brand"~"Flock",i](${bbox});
);
out center tags;
`.trim();
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

    const brand = tags.brand || tags.manufacturer || tags.operator || "";
    const isFlock = /flock/i.test(`${brand} ${tags.name || ""} ${tags.manufacturer || ""}`);
    const type = isFlock ? "Flock" : tags["surveillance:type"] || "ALPR";
    const name =
      tags.name ||
      tags["addr:street"] ||
      (brand ? String(brand) : null) ||
      `OSM ALPR #${el.id}`;

    return {
      id: `osm-${el.type || "node"}-${el.id}`,
      lat: Number(lat),
      lng: Number(lng),
      name: String(name).slice(0, 120),
      type: String(type),
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
   * @param {{force?: boolean, signal?: AbortSignal, pad?: number}} [opts]
   */
  async function fetchInBounds(bounds, opts = {}) {
    if (!bounds) {
      lastStatus = { ok: false, count: 0, source: null, error: "No bounds", fetchedAt: null, bounds: null };
      return [];
    }

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
      };
      return [];
    }

    const key = cacheKey(b);
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
        };
        return cached.slice(0, MAX_RESULTS);
      }
    }

    const query = buildQuery(b);
    let lastErr = null;

    for (const mirror of MIRRORS) {
      try {
        const data = await fetchFromMirror(mirror, query, opts.signal);
        const elements = data.elements || [];
        const cameras = [];
        const seen = new Set();

        for (const el of elements) {
          const cam = elementToCamera(el);
          if (!cam) continue;
          if (seen.has(cam.id)) continue;
          seen.add(cam.id);
          cameras.push(cam);
          if (cameras.length >= MAX_RESULTS) break;
        }

        writeCache(key, cameras);
        lastStatus = {
          ok: true,
          count: cameras.length,
          source: mirror.replace(/^https?:\/\//, "").split("/")[0],
          error: null,
          fetchedAt: new Date().toISOString(),
          bounds: b,
        };
        // Drop raw Overpass payload reference ASAP
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
