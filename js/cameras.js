/**
 * Flock Dodger — camera geometry helpers (live OSM + community reports).
 * No mock / procedural camera inventory.
 */

const CameraData = (() => {
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

  function camerasNearRoute(cameras, coords, bufferMeters) {
    if (!coords?.length || !cameras?.length) return [];
    return cameras.filter((cam) => {
      const d = minDistanceToRouteMeters(cam.lat, cam.lng, coords);
      return d <= bufferMeters;
    });
  }

  /**
   * Suggest avoidance waypoints: modest offset past camera clusters on the route.
   * coords: array of [lat, lng]
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

      const meters = Math.min(180, Math.max(60, bufferMeters * 0.7));
      const latPerM = 1 / 111320;
      const lngPerM = 1 / (111320 * Math.cos((cLat * Math.PI) / 180));
      const nLat = -dLng / len;
      const nLng = dLat / len;

      const along = 0.35;
      const baseLat = routeCoords[bestIdx][0] + (dLat / len) * along * meters * latPerM;
      const baseLng = routeCoords[bestIdx][1] + (dLng / len) * along * meters * lngPerM;

      const side1 = {
        lat: baseLat + nLat * meters * latPerM,
        lng: baseLng + nLng * meters * lngPerM,
      };
      const side2 = {
        lat: baseLat - nLat * meters * latPerM,
        lng: baseLng - nLng * meters * lngPerM,
      };

      const scoreSide = (s) =>
        camerasOnRoute.reduce(
          (n, cam) =>
            n + (haversineMeters(s.lat, s.lng, cam.lat, cam.lng) < bufferMeters * 1.2 ? 1 : 0),
          0
        );

      waypoints.push(scoreSide(side1) <= scoreSide(side2) ? side1 : side2);
    }

    return waypoints.slice(0, 4);
  }

  return {
    camerasNearRoute,
    haversineMeters,
    minDistanceToRouteMeters,
    buildAvoidanceWaypoints,
  };
})();
