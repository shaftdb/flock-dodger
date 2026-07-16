/**
 * Routing via public OSRM demo server + camera-avoidance scoring.
 * Fallback: straight-line / synthetic path if OSRM is unavailable.
 */

const Routing = (() => {
  const OSRM = "https://router.project-osrm.org";

  /**
   * @param {number} lat1
   * @param {number} lng1
   * @param {number} lat2
   * @param {number} lng2
   * @param {{waypoints?: Array<{lat:number,lng:number}>, alternatives?: boolean}} [opts]
   */
  async function getRoute(lat1, lng1, lat2, lng2, opts = {}) {
    const pts = [{ lat: lat1, lng: lng1 }, ...(opts.waypoints || []), { lat: lat2, lng: lng2 }];
    const coordStr = pts.map((p) => `${p.lng},${p.lat}`).join(";");
    const params = new URLSearchParams({
      overview: "full",
      geometries: "geojson",
      steps: "false",
      alternatives: opts.alternatives ? "true" : "false",
    });

    const url = `${OSRM}/route/v1/driving/${coordStr}?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Routing failed (${res.status})`);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) {
      throw new Error(data.message || "No route found");
    }

    return data.routes.map((r) => normalizeOsrmRoute(r));
  }

  function normalizeOsrmRoute(r) {
    // GeoJSON is [lng, lat] → convert to [lat, lng] for Leaflet
    const coords = (r.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);
    return {
      coords,
      distance: r.distance, // meters
      duration: r.duration, // seconds
      source: "osrm",
    };
  }

  /** Great-circle fallback when OSRM is blocked/offline */
  function fallbackRoute(lat1, lng1, lat2, lng2, waypoints = []) {
    const path = [[lat1, lng1], ...waypoints.map((w) => [w.lat, w.lng]), [lat2, lng2]];
    // densify
    const coords = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const steps = 24;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        coords.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    let dist = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      dist += CameraData.haversineMeters(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
    }
    // ~40 km/h average urban
    const duration = (dist / 1000 / 40) * 3600;
    return { coords, distance: dist, duration, source: "fallback" };
  }

  /**
   * Compute standard + avoidance routes and privacy stats.
   * @param {object} [opts]
   * @param {Array<{lat:number,lng:number}>} [opts.userWaypoints] — forced vias (dragged route)
   */
  async function planRoutes(start, end, bufferMeters, allCameras, opts = {}) {
    let standard;
    let alternatives = [];
    const userWaypoints = Array.isArray(opts.userWaypoints)
      ? opts.userWaypoints.filter((w) => w && Number.isFinite(w.lat) && Number.isFinite(w.lng))
      : [];

    try {
      const routes = await getRoute(start.lat, start.lng, end.lat, end.lng, { alternatives: true });
      standard = routes[0];
      alternatives = routes.slice(1);
    } catch (err) {
      console.warn("OSRM standard route failed, using fallback", err);
      standard = fallbackRoute(start.lat, start.lng, end.lat, end.lng);
    }

    const camsOnStandard = CameraData.camerasNearRoute(allCameras, standard.coords, bufferMeters);

    // Build avoidance via waypoints from cameras on standard route
    const avoidWps = CameraData.buildAvoidanceWaypoints(standard.coords, camsOnStandard, bufferMeters);

    let avoidCandidates = [];

    // User-dragged vias take priority as a forced avoid candidate
    if (userWaypoints.length) {
      try {
        const viaRoutes = await getRoute(start.lat, start.lng, end.lat, end.lng, {
          waypoints: userWaypoints,
        });
        avoidCandidates.push(
          ...viaRoutes.map((r) => ({ ...r, source: r.source || "osrm", userShaped: true }))
        );
      } catch (err) {
        console.warn("User via route failed", err);
        avoidCandidates.push({
          ...fallbackRoute(start.lat, start.lng, end.lat, end.lng, userWaypoints),
          userShaped: true,
        });
      }
    }

    // Try OSRM with avoidance waypoints
    if (avoidWps.length) {
      try {
        const viaRoutes = await getRoute(start.lat, start.lng, end.lat, end.lng, {
          waypoints: avoidWps,
        });
        avoidCandidates.push(...viaRoutes);
      } catch (err) {
        console.warn("Via avoidance route failed", err);
      }
    }

    // Include OSRM alternatives
    avoidCandidates.push(...alternatives);

    // Synthetic detour candidate using offset midpoints
    if (avoidWps.length) {
      avoidCandidates.push(fallbackRoute(start.lat, start.lng, end.lat, end.lng, avoidWps));
    }

    // Score candidates: fewer cameras is better; slight penalty for extra distance
    function scoreRoute(route) {
      const cams = CameraData.camerasNearRoute(allCameras, route.coords, bufferMeters);
      const extraDistRatio = Math.max(0, route.distance / Math.max(standard.distance, 1) - 1);
      const cameraScore = cams.length * 100;
      const distPenalty = extraDistRatio * 40;
      // Prefer not absurdly long detours (>2.5x)
      const hardPenalty = route.distance > standard.distance * 2.5 ? 500 : 0;
      return {
        route,
        cams,
        score: cameraScore + distPenalty + hardPenalty,
        cameraCount: cams.length,
      };
    }

    // Always include standard as baseline candidate
    const scored = avoidCandidates.map(scoreRoute);
    const standardScored = scoreRoute(standard);

    // Best avoidance = lowest score; if tie, prefer shorter.
    // Prefer user-shaped routes when present (dragged vias).
    scored.sort((a, b) => {
      const ua = a.route.userShaped ? 0 : 1;
      const ub = b.route.userShaped ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return a.score - b.score || a.route.distance - b.route.distance;
    });

    let bestAvoid = scored[0];

    // If no candidates or avoid is worse/equal cameras and much longer, synthesize better offset path
    if (!bestAvoid || bestAvoid.cameraCount >= standardScored.cameraCount) {
      // Try flipped offset waypoints
      if (camsOnStandard.length) {
        const flipped = avoidWps.map((w, i) => {
          const cam = camsOnStandard[Math.min(i, camsOnStandard.length - 1)];
          return {
            lat: cam.lat * 2 - w.lat,
            lng: cam.lng * 2 - w.lng,
          };
        });
        try {
          const r = await getRoute(start.lat, start.lng, end.lat, end.lng, { waypoints: flipped });
          const s = scoreRoute(r[0]);
          if (!bestAvoid || s.score < bestAvoid.score) bestAvoid = s;
        } catch {
          const fb = scoreRoute(fallbackRoute(start.lat, start.lng, end.lat, end.lng, flipped));
          if (!bestAvoid || fb.score < bestAvoid.score) bestAvoid = fb;
        }
      }
    }

    if (!bestAvoid) bestAvoid = standardScored;

    // If avoidance is essentially the same and still has same cameras, keep it but mark as limited
    const avoidRoute = bestAvoid.route;
    const camsOnAvoid = bestAvoid.cams;

    const avoidedCount = Math.max(0, camsOnStandard.length - camsOnAvoid.length);
    const extraDist = Math.max(0, avoidRoute.distance - standard.distance);
    const extraTime = Math.max(0, avoidRoute.duration - standard.duration);

    const privacyScore = computePrivacyScore({
      onStandard: camsOnStandard.length,
      onAvoid: camsOnAvoid.length,
      extraDistRatio: standard.distance > 0 ? extraDist / standard.distance : 0,
    });

    return {
      standard,
      avoid: avoidRoute,
      camsOnStandard,
      camsOnAvoid,
      avoidedCount,
      extraDist,
      extraTime,
      privacyScore,
      bufferMeters,
    };
  }

  function computePrivacyScore({ onStandard, onAvoid, extraDistRatio }) {
    // 100 = no cameras on avoid route and reasonable detour
    let score = 100;
    // Heavy penalty per remaining camera
    score -= onAvoid * 18;
    // Credit for cameras avoided
    if (onStandard > 0) {
      const ratio = (onStandard - onAvoid) / onStandard;
      score = score * 0.35 + (ratio * 100) * 0.65;
    } else {
      score = 100; // already clean corridor
    }
    // Mild detour penalty beyond 15%
    if (extraDistRatio > 0.15) {
      score -= Math.min(20, (extraDistRatio - 0.15) * 50);
    }
    score = Math.round(Math.max(0, Math.min(100, score)));
    return score;
  }

  function formatDistance(meters) {
    if (meters == null || Number.isNaN(meters)) return "—";
    if (meters < 1000) return `${Math.round(meters)} m`;
    const mi = meters / 1609.344;
    const km = meters / 1000;
    // Prefer miles for US-centric demo; show both-ish via mi
    if (mi < 10) return `${mi.toFixed(1)} mi`;
    return `${mi.toFixed(1)} mi`;
  }

  function formatDuration(seconds) {
    if (seconds == null || Number.isNaN(seconds)) return "—";
    const m = Math.round(seconds / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm ? `${h} h ${rm} min` : `${h} h`;
  }

  function privacyLabel(score) {
    if (score >= 85) return "Excellent privacy";
    if (score >= 70) return "Strong privacy";
    if (score >= 50) return "Moderate privacy";
    if (score >= 30) return "Limited privacy";
    return "High exposure";
  }

  return {
    getRoute,
    planRoutes,
    formatDistance,
    formatDuration,
    privacyLabel,
    fallbackRoute,
  };
})();
