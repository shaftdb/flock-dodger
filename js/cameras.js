/**
 * Flock Dodger — ALPR / Flock Safety camera access layer
 * Loads CAMERA_DATASET (US mock points) + region-aware procedural fill.
 * For demo / privacy-tool prototyping only — not a complete real-world inventory.
 */

const CameraData = (() => {
  const KNOWN = typeof CAMERA_DATASET !== "undefined" ? CAMERA_DATASET.ALL : [];
  const HOT_REGIONS =
    typeof CAMERA_DATASET !== "undefined" ? CAMERA_DATASET.HOT_REGIONS : [];

  /** Simple string hash for deterministic procedural points */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seededRandom(seed) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /** Max density boost for a point inside hot regions */
  function densityForPoint(lat, lng) {
    let d = 0.32; // baseline US fill rate
    for (const r of HOT_REGIONS) {
      if (lat >= r.minLat && lat <= r.maxLat && lng >= r.minLng && lng <= r.maxLng) {
        d = Math.max(d, r.density);
      }
    }
    return d;
  }

  function isHotRegion(bounds) {
    return HOT_REGIONS.some(
      (r) =>
        bounds.maxLat >= r.minLat &&
        bounds.minLat <= r.maxLat &&
        bounds.maxLng >= r.minLng &&
        bounds.minLng <= r.maxLng
    );
  }

  /**
   * Get cameras near a bounding box, including procedural fillers for demo density.
   * @param {{minLat:number,maxLat:number,minLng:number,maxLng:number}} bounds
   * @param {number} [density=14] legacy cap hint
   */
  function getCamerasInBounds(bounds, density = 14) {
    const pad = 0.025;
    const minLat = bounds.minLat - pad;
    const maxLat = bounds.maxLat + pad;
    const minLng = bounds.minLng - pad;
    const maxLng = bounds.maxLng + pad;

    const known = KNOWN.filter(
      (c) => c.lat >= minLat && c.lat <= maxLat && c.lng >= minLng && c.lng <= maxLng
    ).map((c, i) => ({
      ...c,
      id: `known-${c.region || "US"}-${i}-${c.lat.toFixed(4)}-${c.lng.toFixed(4)}`,
    }));

    // Procedural grid — denser in OH/WV hot regions
    const procedural = [];
    const hot = isHotRegion({ minLat, maxLat, minLng, maxLng });
    const latStep = hot ? 0.012 : 0.02;
    const lngStep = hot ? 0.015 : 0.024;
    const startLat = Math.floor(minLat / latStep) * latStep;
    const startLng = Math.floor(minLng / lngStep) * lngStep;

    for (let lat = startLat; lat <= maxLat; lat += latStep) {
      for (let lng = startLng; lng <= maxLng; lng += lngStep) {
        const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
        const rnd = seededRandom(hash("fd-" + key));
        const thresh = densityForPoint(lat, lng);
        // Keep cell if random < density threshold
        if (rnd() > thresh) continue;
        const jLat = lat + (rnd() - 0.5) * latStep * 0.75;
        const jLng = lng + (rnd() - 0.5) * lngStep * 0.75;
        if (jLat < minLat || jLat > maxLat || jLng < minLng || jLng > maxLng) continue;

        const types = ["Flock", "ALPR", "Flock", "Municipal ALPR"];
        const region =
          HOT_REGIONS.find(
            (r) => jLat >= r.minLat && jLat <= r.maxLat && jLng >= r.minLng && jLng <= r.maxLng
          )?.label || "US";

        procedural.push({
          id: `proc-${key}`,
          lat: jLat,
          lng: jLng,
          name: region === "OH" || region === "WV" || region === "PA-SW"
            ? `${region} arterial camera ${key}`
            : `Corridor camera ${key}`,
          type: types[Math.floor(rnd() * types.length)],
          source: "procedural-demo",
          region,
        });
      }
    }

    // Cap procedural so huge map views stay usable
    const maxProc = hot ? density * 14 : density * 8;
    let procs = procedural;
    if (procs.length > maxProc) {
      procs = procs
        .map((c) => ({ c, s: hash(c.id) }))
        .sort((a, b) => a.s - b.s)
        .slice(0, maxProc)
        .map((x) => x.c);
    }

    return [...known, ...procs];
  }

  /**
   * Cameras near a polyline within buffer meters.
   * coords: array of [lat, lng]
   */
  function camerasNearRoute(cameras, coords, bufferMeters) {
    if (!coords?.length || !cameras?.length) return [];
    return cameras.filter((cam) => {
      const d = minDistanceToRouteMeters(cam.lat, cam.lng, coords);
      return d <= bufferMeters;
    });
  }

  function haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /** Distance from point to segment in meters (approx local equirectangular) */
  function distPointToSegmentMeters(pLat, pLng, aLat, aLng, bLat, bLng) {
    const toXY = (lat, lng) => {
      const x =
        ((lng * Math.PI) / 180) *
        6371000 *
        Math.cos((((pLat + aLat + bLat) / 3) * Math.PI) / 180);
      const y = ((lat * Math.PI) / 180) * 6371000;
      return { x, y };
    };
    const p = toXY(pLat, pLng);
    const a = toXY(aLat, aLng);
    const b = toXY(bLat, bLng);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  function minDistanceToRouteMeters(lat, lng, coords) {
    let min = Infinity;
    const step = coords.length > 400 ? 2 : 1;
    for (let i = 0; i < coords.length - 1; i += step) {
      const a = coords[i];
      const b = coords[Math.min(i + step, coords.length - 1)];
      const d = distPointToSegmentMeters(lat, lng, a[0], a[1], b[0], b[1]);
      if (d < min) min = d;
    }
    return min;
  }

  /**
   * Suggest avoidance waypoints: offset away from cameras that sit on the route.
   * Returns array of {lat, lng} suitable for OSRM via.
   */
  function buildAvoidanceWaypoints(routeCoords, camerasOnRoute, bufferMeters) {
    if (!routeCoords?.length || !camerasOnRoute?.length) return [];

    const waypoints = [];
    const used = new Set();
    const clusterRadius = Math.max(bufferMeters * 1.5, 200);

    for (let i = 0; i < camerasOnRoute.length; i++) {
      if (used.has(i)) continue;
      const cluster = [camerasOnRoute[i]];
      used.add(i);
      for (let j = i + 1; j < camerasOnRoute.length; j++) {
        if (used.has(j)) continue;
        const d = haversineMeters(
          camerasOnRoute[i].lat,
          camerasOnRoute[i].lng,
          camerasOnRoute[j].lat,
          camerasOnRoute[j].lng
        );
        if (d < clusterRadius) {
          cluster.push(camerasOnRoute[j]);
          used.add(j);
        }
      }

      const cLat = cluster.reduce((s, c) => s + c.lat, 0) / cluster.length;
      const cLng = cluster.reduce((s, c) => s + c.lng, 0) / cluster.length;

      let bestIdx = 0;
      let bestD = Infinity;
      for (let k = 0; k < routeCoords.length; k++) {
        const d = haversineMeters(cLat, cLng, routeCoords[k][0], routeCoords[k][1]);
        if (d < bestD) {
          bestD = d;
          bestIdx = k;
        }
      }

      const prev = routeCoords[Math.max(0, bestIdx - 3)];
      const next = routeCoords[Math.min(routeCoords.length - 1, bestIdx + 3)];
      const dLat = next[0] - prev[0];
      const dLng = next[1] - prev[1];
      const len = Math.hypot(dLat, dLng) || 1e-9;

      const meters = bufferMeters * 1.6 + 80;
      const latPerM = 1 / 111320;
      const lngPerM = 1 / (111320 * Math.cos((cLat * Math.PI) / 180));
      const nLat = -dLng / len;
      const nLng = dLat / len;

      const side1 = {
        lat: routeCoords[bestIdx][0] + nLat * meters * latPerM,
        lng: routeCoords[bestIdx][1] + nLng * meters * lngPerM,
      };
      const side2 = {
        lat: routeCoords[bestIdx][0] - nLat * meters * latPerM,
        lng: routeCoords[bestIdx][1] - nLng * meters * lngPerM,
      };

      const scoreSide = (s) =>
        camerasOnRoute.reduce(
          (n, cam) =>
            n + (haversineMeters(s.lat, s.lng, cam.lat, cam.lng) < bufferMeters * 1.2 ? 1 : 0),
          0
        );

      const wp = scoreSide(side1) <= scoreSide(side2) ? side1 : side2;
      waypoints.push(wp);
    }

    return waypoints.slice(0, 8);
  }

  function getStats() {
    const byRegion = {};
    for (const c of KNOWN) {
      const r = c.region || "US";
      byRegion[r] = (byRegion[r] || 0) + 1;
    }
    return { total: KNOWN.length, byRegion };
  }

  return {
    KNOWN,
    getCamerasInBounds,
    camerasNearRoute,
    haversineMeters,
    minDistanceToRouteMeters,
    buildAvoidanceWaypoints,
    getStats,
  };
})();
