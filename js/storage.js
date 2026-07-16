/**
 * LocalStorage helpers: routes, reports, saved areas, camera votes.
 */

const Storage = (() => {
  const KEY = "flock-dodger-saved-routes";
  const SETTINGS_KEY = "flock-dodger-settings";
  const REPORTS_KEY = "flock-dodger-community-reports";
  const AREAS_KEY = "flock-dodger-saved-areas";
  const VOTES_KEY = "flock-dodger-camera-votes";
  const MAX_ROUTES = 25;
  const MAX_REPORTS = 200;
  const MAX_AREAS = 12;

  function loadRoutes() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveRoutes(routes) {
    localStorage.setItem(KEY, JSON.stringify(routes.slice(0, MAX_ROUTES)));
  }

  function addRoute(route) {
    const routes = loadRoutes();
    const entry = {
      id: route.id || `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name:
        route.name ||
        `${shortName(route.start?.display_name)} → ${shortName(route.end?.display_name)}`,
      start: route.start,
      end: route.end,
      bufferMeters: route.bufferMeters ?? 150,
      stats: route.stats || null,
      createdAt: route.createdAt || new Date().toISOString(),
    };
    routes.unshift(entry);
    saveRoutes(routes);
    return entry;
  }

  function removeRoute(id) {
    const routes = loadRoutes().filter((r) => r.id !== id);
    saveRoutes(routes);
    return routes;
  }

  function shortName(display) {
    if (!display) return "Unknown";
    const part = display.split(",")[0].trim();
    return part.length > 28 ? part.slice(0, 26) + "…" : part;
  }

  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveSettings(partial) {
    const next = { ...loadSettings(), ...partial };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }

  // ── Community reports ────────────────────────────────────────────────────

  function loadReports() {
    try {
      const raw = localStorage.getItem(REPORTS_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveReports(reports) {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports.slice(0, MAX_REPORTS)));
  }

  function addReport(report) {
    const lat = Number(report.lat);
    const lng = Number(report.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Valid latitude and longitude are required");
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error("Coordinates out of range");
    }

    const reports = loadReports();
    const entry = {
      id: report.id || `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      lat,
      lng,
      name: (report.name || "").trim() || "Community-reported camera",
      type: report.type || "Flock",
      notes: (report.notes || "").trim().slice(0, 500),
      direction: report.direction || "",
      confidence: report.confidence || "sighted",
      address: (report.address || "").trim().slice(0, 200),
      source: "community",
      region: report.region || "local",
      createdAt: report.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    reports.unshift(entry);
    saveReports(reports);
    return entry;
  }

  function updateReport(id, patch) {
    const reports = loadReports();
    const idx = reports.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    reports[idx] = {
      ...reports[idx],
      ...patch,
      id: reports[idx].id,
      source: "community",
      updatedAt: new Date().toISOString(),
    };
    saveReports(reports);
    return reports[idx];
  }

  function removeReport(id) {
    const reports = loadReports().filter((r) => r.id !== id);
    saveReports(reports);
    return reports;
  }

  function clearReports() {
    saveReports([]);
    return [];
  }

  function reportsAsCameras(bounds) {
    let list = loadReports();
    if (bounds) {
      const pad = 0.02;
      list = list.filter(
        (c) =>
          c.lat >= bounds.minLat - pad &&
          c.lat <= bounds.maxLat + pad &&
          c.lng >= bounds.minLng - pad &&
          c.lng <= bounds.maxLng + pad
      );
    }
    return list.map((r) => ({
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      name: r.name,
      type: r.type || "Flock",
      source: "community",
      region: r.region || "local",
      notes: r.notes,
      confidence: r.confidence,
      community: true,
      alpr: true,
      category: "alpr",
    }));
  }

  // ── Saved areas (home / work corridors) ──────────────────────────────────

  function loadAreas() {
    try {
      const data = JSON.parse(localStorage.getItem(AREAS_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveAreas(areas) {
    localStorage.setItem(AREAS_KEY, JSON.stringify(areas.slice(0, MAX_AREAS)));
  }

  /**
   * @param {{id?:string, label:string, lat:number, lng:number, radiusMi?:number}} area
   */
  function upsertArea(area) {
    const areas = loadAreas();
    const id = area.id || `area-${area.label.toLowerCase().replace(/\s+/g, "-")}`;
    const entry = {
      id,
      label: area.label,
      lat: Number(area.lat),
      lng: Number(area.lng),
      radiusMi: area.radiusMi ?? 20,
      updatedAt: new Date().toISOString(),
    };
    const idx = areas.findIndex((a) => a.id === id || a.label === area.label);
    if (idx >= 0) areas[idx] = entry;
    else areas.push(entry);
    saveAreas(areas);
    return entry;
  }

  function removeArea(id) {
    const areas = loadAreas().filter((a) => a.id !== id);
    saveAreas(areas);
    return areas;
  }

  // ── Camera quality votes (local) ─────────────────────────────────────────

  function loadVotes() {
    try {
      return JSON.parse(localStorage.getItem(VOTES_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveVotes(votes) {
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  }

  /** @param {string} cameraId @param {"still_there"|"gone"|"unsure"} vote */
  function setCameraVote(cameraId, vote) {
    const votes = loadVotes();
    votes[cameraId] = { vote, at: new Date().toISOString() };
    saveVotes(votes);
    return votes[cameraId];
  }

  function getCameraVote(cameraId) {
    return loadVotes()[cameraId] || null;
  }

  return {
    loadRoutes,
    addRoute,
    removeRoute,
    shortName,
    loadSettings,
    saveSettings,
    loadReports,
    addReport,
    updateReport,
    removeReport,
    clearReports,
    reportsAsCameras,
    loadAreas,
    upsertArea,
    removeArea,
    loadVotes,
    setCameraVote,
    getCameraVote,
  };
})();
