/**
 * Trip mode — wake lock, progress along route, next camera ahead banner.
 */

const TripMode = (() => {
  let active = false;
  let wakeLock = null;
  let watchId = null;
  let routeCoords = [];
  let cameras = [];
  let bufferM = 150;
  let onUpdate = null;
  let lastPos = null;

  function isActive() {
    return active;
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

  /** Distance along route from start to nearest point near (lat,lng) */
  function progressAlongRoute(lat, lng, coords) {
    if (!coords?.length) return { distM: 0, idx: 0, totalM: 0 };
    let bestIdx = 0;
    let bestD = Infinity;
    let cum = [0];
    for (let i = 1; i < coords.length; i++) {
      cum[i] =
        cum[i - 1] +
        haversineMeters(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    }
    const totalM = cum[cum.length - 1] || 1;
    for (let i = 0; i < coords.length; i++) {
      const d = haversineMeters(lat, lng, coords[i][0], coords[i][1]);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    return { distM: cum[bestIdx], idx: bestIdx, totalM, offRouteM: bestD };
  }

  function camerasAhead(lat, lng, coords, cams, bufferMeters) {
    if (!coords?.length || !cams?.length) return [];
    const prog = progressAlongRoute(lat, lng, coords);
    const ahead = [];
    for (const cam of cams) {
      const cp = progressAlongRoute(cam.lat, cam.lng, coords);
      // near the polyline and further along than us
      if (cp.offRouteM > Math.max(bufferMeters * 2, 250)) continue;
      if (cp.distM < prog.distM - 80) continue;
      const remain = cp.distM - prog.distM;
      ahead.push({
        cam,
        remainM: Math.max(0, remain),
        remainMi: Math.max(0, remain) / 1609.344,
      });
    }
    ahead.sort((a, b) => a.remainM - b.remainM);
    return ahead;
  }

  async function requestWakeLock() {
    try {
      if (navigator.wakeLock?.request) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
      }
    } catch {
      wakeLock = null;
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeLock?.release();
    } catch {
      /* ignore */
    }
    wakeLock = null;
  }

  function emit() {
    if (typeof onUpdate !== "function" || !lastPos) return;
    const ahead = camerasAhead(
      lastPos.lat,
      lastPos.lng,
      routeCoords,
      cameras,
      bufferM
    );
    const prog = progressAlongRoute(lastPos.lat, lastPos.lng, routeCoords);
    const next = ahead[0] || null;
    onUpdate({
      active: true,
      next,
      aheadCount: ahead.length,
      progressPct: Math.min(100, Math.round((prog.distM / prog.totalM) * 100)),
      offRouteM: prog.offRouteM,
      lat: lastPos.lat,
      lng: lastPos.lng,
    });
  }

  function start(opts) {
    routeCoords = opts.coords || [];
    cameras = opts.cameras || [];
    bufferM = opts.bufferMeters ?? 150;
    onUpdate = opts.onUpdate || null;
    active = true;
    requestWakeLock();

    const handlePos = (lat, lng) => {
      lastPos = { lat, lng };
      emit();
    };

    // Prefer watchPosition
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => handlePos(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
      );
    }

    // Capacitor
    const CapGeo = window.Capacitor?.Plugins?.Geolocation;
    if (CapGeo?.watchPosition) {
      CapGeo.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
        if (err || !pos) return;
        handlePos(pos.coords.latitude, pos.coords.longitude);
      }).then((id) => {
        watchId = { capacitor: id };
      });
    }

    // Seed with last known if any
    if (opts.seedLat != null) {
      handlePos(opts.seedLat, opts.seedLng);
    }

    document.addEventListener("visibilitychange", onVis);
    return true;
  }

  function onVis() {
    if (document.visibilityState === "visible" && active) requestWakeLock();
  }

  function stop() {
    active = false;
    document.removeEventListener("visibilitychange", onVis);
    releaseWakeLock();
    if (watchId != null && typeof watchId === "number") {
      navigator.geolocation?.clearWatch(watchId);
    }
    if (watchId?.capacitor != null) {
      window.Capacitor?.Plugins?.Geolocation?.clearWatch?.({ id: watchId.capacitor });
    }
    watchId = null;
    lastPos = null;
    if (typeof onUpdate === "function") {
      onUpdate({ active: false });
    }
  }

  function updateCameras(cams) {
    cameras = cams || [];
    emit();
  }

  function updateRoute(coords) {
    routeCoords = coords || [];
    emit();
  }

  return {
    isActive,
    start,
    stop,
    updateCameras,
    updateRoute,
    camerasAhead,
    progressAlongRoute,
  };
})();
