/**
 * Live ALPR camera fetch via OpenStreetMap Overpass API.
 * Data is community-mapped (same ecosystem as DeFlock / OSM tags).
 * Respect public Overpass etiquette: bbox limits, caching, timeouts.
 */

const OverpassCameras = (() => {
  const MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
  ];

  const CACHE_PREFIX = "flock-dodger-osm-alpr:";
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
  const MAX_BBOX_DEG = 1.8; // skip huge views (timeout risk)
  const MAX_RESULTS = 2500;

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

  function padBounds(bounds, padDeg = 0.02) {
    return {
      minLat: bounds.minLat - padDeg,
      maxLat: bounds.maxLat + padDeg,
      minLng: bounds.minLng - padDeg,
      maxLng: bounds.maxLng + padDeg,
    };
  }

  function bboxArea(b) {
    return Math.abs(b.maxLat - b.minLat) * Math.abs(b.maxLng - b.minLng);
  }

  function cacheKey(b) {
    // Quantize to ~0.05° cells so nearby pans reuse cache
    const q = (n) => (Math.floor(n * 20) / 20).toFixed(2);
    return `${CACHE_PREFIX}${q(b.minLat)},${q(b.minLng)},${q(b.maxLat)},${q(b.maxLng)}`;
  }

  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.expires || Date.now() > data.expires) {
        localStorage.removeItem(key);
        return null;
      }
      return data.cameras || null;
    } catch {
      return null;
    }
  }

  function writeCache(key, cameras) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          expires: Date.now() + CACHE_TTL_MS,
          cameras,
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      // Quota exceeded — ignore
    }
  }

  function buildQuery(b) {
    const s = b.minLat.toFixed(5);
    const w = b.minLng.toFixed(5);
    const n = b.maxLat.toFixed(5);
    const e = b.maxLng.toFixed(5);
    const bbox = `${s},${w},${n},${e}`;

    // Match community ALPR tagging used on OSM / DeFlock-style mapping
    return `
[out:json][timeout:28];
(
  node["surveillance:type"="ALPR"](${bbox});
  way["surveillance:type"="ALPR"](${bbox});
  node["surveillance:type"="alpr"](${bbox});
  node["man_made"="surveillance"]["surveillance:type"~"^(ALPR|alpr|ANPR|anpr)$"](${bbox});
  node["camera:type"~"ALPR|alpr|ANPR|anpr"](${bbox});
  node["manufacturer"~"Flock",i](${bbox});
  node["brand"~"Flock",i](${bbox});
  node["operator"~"Flock",i](${bbox});
  node["name"~"Flock Safety",i](${bbox});
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

    const brand =
      tags.brand ||
      tags.manufacturer ||
      tags.operator ||
      tags["operator:wikidata"] ||
      "";
    const isFlock = /flock/i.test(
      `${brand} ${tags.name || ""} ${tags.manufacturer || ""} ${tags.operator || ""}`
    );
    const type = isFlock
      ? "Flock"
      : tags["surveillance:type"] || tags["camera:type"] || "ALPR";

    const nameParts = [
      tags.name,
      tags["addr:street"] || tags.street,
      brand && !tags.name ? brand : null,
    ].filter(Boolean);

    return {
      id: `osm-${el.type || "node"}-${el.id}`,
      lat: Number(lat),
      lng: Number(lng),
      name: nameParts.join(" · ") || `OSM ALPR #${el.id}`,
      type: String(type).toUpperCase().includes("FLOCK") ? "Flock" : String(type),
      source: "openstreetmap",
      region: tags["addr:state"] || tags["is_in:state"] || "",
      osmId: el.id,
      osmType: el.type || "node",
      manufacturer: tags.manufacturer || tags.brand || "",
      operator: tags.operator || "",
      direction: tags.direction || tags["camera:direction"] || "",
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
   * Fetch ALPR cameras for a bounding box.
   * @param {{minLat,maxLat,minLng,maxLng}} bounds
   * @param {{force?: boolean, signal?: AbortSignal, pad?: number}} [opts]
   * @returns {Promise<Array>}
   */
  async function fetchInBounds(bounds, opts = {}) {
    if (!bounds) {
      lastStatus = { ok: false, count: 0, source: null, error: "No bounds", fetchedAt: null, bounds: null };
      return [];
    }

    const b = padBounds(bounds, opts.pad ?? 0.025);
    const area = bboxArea(b);

    if (area > MAX_BBOX_DEG * MAX_BBOX_DEG || area > 3.5) {
      lastStatus = {
        ok: false,
        count: 0,
        source: null,
        error: "Zoom in closer for live OSM cameras (view too large)",
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
        return cached;
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

  /** Clear in-browser OSM camera cache */
  function clearCache() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }

  return {
    fetchInBounds,
    getStatus,
    clearCache,
    padBounds,
  };
})();
