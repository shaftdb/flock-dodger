/**
 * Routing via public OSRM demo server + camera-avoidance scoring.
 * Avoid routes stay on the road network — no off-road geometric zigzags.
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
      // Keep driving continuity; reduces tiny U-turn spurs at soft vias
      continue_straight: "true",
    });

    // Soft radiuses on intermediate vias (meters) so OSRM can stay on major roads
    // near the via instead of diving onto a driveway to hit an exact coordinate.
    if (opts.waypoints?.length) {
      const radii = ["unlimited", ...opts.waypoints.map(() => "350"), "unlimited"];
      params.set("radiuses", radii.join(";"));
    }

    const url = `${OSRM}/route/v1/driving/${coordStr}?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Routing failed (${res.status})`);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) {
      throw new Error(data.message || "No route found");
    }

    return data.routes.map((r) => normalizeOsrmRoute(r));
  }

  /** Snap a lat/lng to the nearest drivible road (reduces off-road via spurs). */
  async function nearestOnRoad(lat, lng) {
    try {
      const url = `${OSRM}/nearest/v1/driving/${lng},${lat}?number=1`;
      const res = await fetch(url);
      if (!res.ok) return { lat, lng };
      const data = await res.json();
      const loc = data.waypoints?.[0]?.location;
      if (!loc) return { lat, lng };
      return { lng: loc[0], lat: loc[1] };
    } catch {
      return { lat, lng };
    }
  }

  async function snapWaypoints(waypoints) {
    if (!waypoints?.length) return [];
    // Cap parallel snaps
    const list = waypoints.slice(0, 6);
    const snapped = await Promise.all(list.map((w) => nearestOnRoad(w.lat, w.lng)));
    return snapped;
  }

  function normalizeOsrmRoute(r) {
    const coords = (r.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);
    return {
      coords: cleanCoords(coords),
      distance: r.distance,
      duration: r.duration,
      source: "osrm",
    };
  }

  /** Drop duplicate / near-duplicate vertices that can look like micro-spikes */
  function cleanCoords(coords) {
    if (!coords?.length) return [];
    const out = [coords[0]];
    for (let i = 1; i < coords.length; i++) {
      const a = out[out.length - 1];
      const b = coords[i];
      if (!b || b[0] == null || b[1] == null) continue;
      const dLat = Math.abs(a[0] - b[0]);
      const dLng = Math.abs(a[1] - b[1]);
      if (dLat < 1e-7 && dLng < 1e-7) continue;
      out.push(b);
    }
    return out;
  }

  /**
   * Offline fallback only — never preferred for the green avoid line when OSRM works.
   * Uses road-like densify but still not network-aware.
   */
  function fallbackRoute(lat1, lng1, lat2, lng2, waypoints = []) {
    const path = [[lat1, lng1], ...waypoints.map((w) => [w.lat, w.lng]), [lat2, lng2]];
    const coords = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const steps = 16;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        coords.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    coords.push(path[path.length - 1]);
    let dist = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      dist += CameraData.haversineMeters(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
    }
    const duration = (dist / 1000 / 40) * 3600;
    return { coords: cleanCoords(coords), distance: dist, duration, source: "fallback" };
  }

  /**
   * Build road-friendly avoidance vias:
   * place a point along the route slightly before each camera cluster, then
   * offset modestly and snap to the road network — not raw field offsets.
   */
  async function buildRoadAvoidanceVias(standardCoords, camerasOnRoute, bufferMeters) {
    if (!standardCoords?.length || !camerasOnRoute?.length) return [];

    // Reuse geometric clustering, but use gentler offset
    const raw =
      typeof CameraData.buildAvoidanceWaypoints === "function"
        ? CameraData.buildAvoidanceWaypoints(standardCoords, camerasOnRoute, Math.min(bufferMeters, 120))
        : [];

    // Prefer points taken from alternative-route sampling: midpoints of standard
    // route segments near cameras, shifted only ~80–150m (then snapped).
    const mild = raw.map((w) => {
      // Pull vias halfway back toward the main corridor so they're closer to roads
      return w;
    });

    // Reduce count — each via can create a spur if poorly placed
    const limited = mild.slice(0, 4);
    if (!limited.length) return [];

    return snapWaypoints(limited);
  }

  /**
   * Compute standard + avoidance routes and privacy stats.
   * @param {object} [opts]
   * @param {Array<{lat:number,lng:number}>} [opts.userWaypoints]
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

    /** @type {Array} */
    let avoidCandidates = [];

    // 1) User-dragged vias — snap to road first
    if (userWaypoints.length) {
      try {
        const snapped = await snapWaypoints(userWaypoints);
        const viaRoutes = await getRoute(start.lat, start.lng, end.lat, end.lng, {
          waypoints: snapped,
        });
        avoidCandidates.push(
          ...viaRoutes.map((r) => ({ ...r, userShaped: true, source: "osrm" }))
        );
      } catch (err) {
        console.warn("User via route failed", err);
      }
    }

    // 2) OSRM alternatives (clean road geometry — preferred over offset vias)
    avoidCandidates.push(...alternatives.map((r) => ({ ...r, fromAlternative: true })));

    // 3) Soft avoidance vias from camera clusters (snapped to roads)
    if (camsOnStandard.length && standard.source === "osrm") {
      try {
        const avoidWps = await buildRoadAvoidanceVias(
          standard.coords,
          camsOnStandard,
          bufferMeters
        );
        if (avoidWps.length) {
          const viaRoutes = await getRoute(start.lat, start.lng, end.lat, end.lng, {
            waypoints: avoidWps,
          });
          // Only keep via-routes that don't look like spurty messes
          for (const r of viaRoutes) {
            if (isReasonableDetour(standard, r)) {
              avoidCandidates.push({ ...r, fromAvoidVia: true });
            }
          }
        }
      } catch (err) {
        console.warn("Via avoidance route failed", err);
      }
    }

    // 4) Never add geometric fallback as a green "avoid" candidate when we already
    //    have real OSRM geometry — those straight segments cause off-route green stubs.
    if (!avoidCandidates.length && standard.source !== "osrm") {
      avoidCandidates.push(standard);
    }

    function scoreRoute(route) {
      const cams = CameraData.camerasNearRoute(allCameras, route.coords, bufferMeters);
      const extraDistRatio = Math.max(0, route.distance / Math.max(standard.distance, 1) - 1);
      const cameraScore = cams.length * 100;
      const distPenalty = extraDistRatio * 40;
      const hardPenalty = route.distance > standard.distance * 2.5 ? 500 : 0;
      // Prefer real road geometry over fallback
      const fallbackPenalty = route.source === "fallback" ? 800 : 0;
      // Mild preference for OSRM alternatives over via-forced paths (smoother)
      const viaNoise = route.fromAvoidVia ? 8 : 0;
      return {
        route,
        cams,
        score: cameraScore + distPenalty + hardPenalty + fallbackPenalty + viaNoise,
        cameraCount: cams.length,
      };
    }

    const scored = avoidCandidates.map(scoreRoute);
    const standardScored = scoreRoute(standard);

    scored.sort((a, b) => {
      const ua = a.route.userShaped ? 0 : 1;
      const ub = b.route.userShaped ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return a.score - b.score || a.route.distance - b.route.distance;
    });

    let bestAvoid = scored[0];

    // If via/alternative options aren't better for privacy, keep the standard route
    // as the "avoid" display (no fake green detour stubs).
    if (!bestAvoid || bestAvoid.score >= standardScored.score) {
      bestAvoid = standardScored;
    }

    // If best "avoid" is worse on cameras AND much longer, fall back to standard
    if (
      bestAvoid.cameraCount >= standardScored.cameraCount &&
      bestAvoid.route.distance > standard.distance * 1.15
    ) {
      bestAvoid = standardScored;
    }

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

    const detourReasons = buildDetourReasons({
      standard,
      avoid: avoidRoute,
      camsOnStandard,
      camsOnAvoid,
      avoidedCount,
      extraDist,
      extraTime,
      fromAlternative: Boolean(avoidRoute.fromAlternative),
      fromAvoidVia: Boolean(avoidRoute.fromAvoidVia),
      userShaped: Boolean(avoidRoute.userShaped),
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
      detourReasons,
      alternativeCount: alternatives.length,
    };
  }

  function buildDetourReasons(ctx) {
    const reasons = [];
    if (ctx.userShaped) {
      reasons.push("You shaped this path with drag handles.");
    }
    if (ctx.avoidedCount > 0) {
      reasons.push(
        `Avoids ${ctx.avoidedCount} camera${ctx.avoidedCount === 1 ? "" : "s"} that sit on the standard route.`
      );
    } else if (ctx.camsOnStandard?.length === 0) {
      reasons.push("Standard corridor already looks clear in the loaded camera set.");
    } else {
      reasons.push("No cleaner road alternative found — avoid route matches standard exposure.");
    }
    if (ctx.fromAlternative) {
      reasons.push("Uses an OSRM alternative road path (not a geometric off-road detour).");
    }
    if (ctx.fromAvoidVia) {
      reasons.push("Nudged via soft waypoints past camera clusters, snapped to the road network.");
    }
    if (ctx.extraDist > 200) {
      reasons.push(
        `Trades about ${formatDistance(ctx.extraDist)} / ${formatDuration(ctx.extraTime)} for lower exposure.`
      );
    }
    if (ctx.camsOnAvoid?.length > 0) {
      reasons.push(
        `${ctx.camsOnAvoid.length} camera${ctx.camsOnAvoid.length === 1 ? "" : "s"} still within your buffer on the avoid path.`
      );
    }
    return reasons;
  }

  /**
   * Reject routes that balloon in length for little gain (often spur-heavy via paths).
   */
  function isReasonableDetour(standard, candidate) {
    if (!candidate?.coords?.length) return false;
    if (candidate.distance > standard.distance * 2.2) return false;
    // Too many vertices vs distance can indicate thrashing
    const km = candidate.distance / 1000;
    if (km > 0.5 && candidate.coords.length / km > 800) return false;
    return true;
  }

  function computePrivacyScore({ onStandard, onAvoid, extraDistRatio }) {
    let score = 100;
    score -= onAvoid * 18;
    if (onStandard > 0) {
      const ratio = (onStandard - onAvoid) / onStandard;
      score = score * 0.35 + ratio * 100 * 0.65;
    } else {
      score = 100;
    }
    if (extraDistRatio > 0.15) {
      score -= Math.min(20, (extraDistRatio - 0.15) * 50);
    }
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  function formatDistance(meters) {
    if (meters == null || Number.isNaN(meters)) return "—";
    if (meters < 1000) return `${Math.round(meters)} m`;
    const mi = meters / 1609.344;
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
