/**
 * Flock Dodger — main application
 */

(function () {
  "use strict";

  // ---------- State ----------
  const state = {
    start: null,
    end: null,
    bufferMeters: 150,
    cameras: [],
    lastPlan: null,
    map: null,
    layers: {
      cameras: null,
      buffers: null,
      standard: null,
      avoid: null,
      vias: null,
      preview: null,
      startMarker: null,
      endMarker: null,
    },
    showCameras: true,
    showStandard: true,
    showAvoid: true,
    showBuffers: false,
    showCommunity: true,
    useLiveOsm: true,
    useMockData: false,
    reportPickMode: false,
    osmFetchAbort: null,
    lastOsmCameras: [],
    /** Which planned geometry to hand off to external maps */
    exportRoute: "avoid", // "avoid" | "standard"
    /** User-dragged intermediate points on the avoid route */
    userVias: [],
    planToken: 0,
    isPlanning: false,
    isDragging: false,
    suppressFit: false,
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);

  const els = {
    startInput: $("start-input"),
    endInput: $("end-input"),
    startSug: $("start-suggestions"),
    endSug: $("end-suggestions"),
    btnRoute: $("btn-route"),
    btnSwap: $("btn-swap"),
    btnLocate: $("btn-locate"),
    btnSave: $("btn-save-route"),
    btnFit: $("btn-fit"),
    btnExportGoogle: $("btn-export-google"),
    btnExportApple: $("btn-export-apple"),
    btnExportWaze: $("btn-export-waze"),
    exportRouteAvoid: $("export-route-avoid"),
    exportRouteStandard: $("export-route-standard"),
    exportHint: $("export-hint"),
    btnSaved: $("btn-saved"),
    btnMenu: $("btn-menu"),
    btnInstall: $("btn-install"),
    btnInstallBanner: $("btn-install-banner"),
    btnDismissInstall: $("btn-dismiss-install"),
    installBanner: $("install-banner"),
    sidebar: $("sidebar"),
    bufferSlider: $("buffer-slider"),
    bufferValue: $("buffer-value"),
    statsPanel: $("stats-panel"),
    privacyScore: $("privacy-score"),
    privacyLabel: $("privacy-label"),
    scoreArc: $("score-arc"),
    statAvoided: $("stat-avoided"),
    statOnStandard: $("stat-on-standard"),
    statRemaining: $("stat-remaining"),
    statExtraDist: $("stat-extra-dist"),
    statExtraTime: $("stat-extra-time"),
    stdDistance: $("std-distance"),
    stdDuration: $("std-duration"),
    avoidDistance: $("avoid-distance"),
    avoidDuration: $("avoid-duration"),
    loading: $("loading"),
    loadingText: $("loading-text"),
    loadingSteps: $("loading-steps"),
    mapProgress: $("map-progress"),
    mapEmpty: $("map-empty"),
    offlineChip: $("offline-chip"),
    dragChip: $("drag-chip"),
    routeError: $("route-error"),
    routeErrorText: $("route-error-text"),
    btnRouteRetry: $("btn-route-retry"),
    btnRouteErrorDismiss: $("btn-route-error-dismiss"),
    startWrap: $("start-wrap"),
    endWrap: $("end-wrap"),
    startError: $("start-error"),
    endError: $("end-error"),
    startSpinner: $("start-spinner"),
    endSpinner: $("end-spinner"),
    toast: $("toast"),
    savedModal: $("saved-modal"),
    savedList: $("saved-list"),
    savedEmpty: $("saved-empty"),
    toggleCameras: $("toggle-cameras"),
    toggleStandard: $("toggle-standard"),
    toggleAvoid: $("toggle-avoid"),
    toggleBuffers: $("toggle-buffers"),
    toggleCommunity: $("toggle-community"),
    toggleLiveOsm: $("toggle-live-osm"),
    toggleMockData: $("toggle-mock-data"),
    osmStatus: $("osm-status"),
    btnRefreshOsm: $("btn-refresh-osm"),
    btnReport: $("btn-report"),
    btnReportOpen: $("btn-report-open"),
    reportModal: $("report-modal"),
    reportForm: $("report-form"),
    reportName: $("report-name"),
    reportType: $("report-type"),
    reportConfidence: $("report-confidence"),
    reportDirection: $("report-direction"),
    reportLat: $("report-lat"),
    reportLng: $("report-lng"),
    reportAddress: $("report-address"),
    reportNotes: $("report-notes"),
    reportFormError: $("report-form-error"),
    reportCoordsHint: $("report-coords-hint"),
    btnReportPick: $("btn-report-pick"),
    btnReportGps: $("btn-report-gps"),
    btnReportSubmit: $("btn-report-submit"),
    reportPickChip: $("report-pick-chip"),
    communityList: $("community-list"),
    communityEmpty: $("community-empty"),
    reportCount: $("report-count"),
  };

  // ---------- Map focus (auto area / route) ----------
  /** Default local area radius in miles (mid of ~25–50 mi) */
  const LOCAL_AREA_RADIUS_MI = 30;
  /** Hard cap: Leaflet DOM markers blow up mobile memory above a few hundred */
  const MAX_MAP_MARKERS = 350;
  const MAX_ROUTE_CAMERAS = 500;
  const MAX_BUFFER_CIRCLES = 80;

  function milesToLatDelta(miles) {
    return miles / 69.0;
  }

  function milesToLngDelta(miles, lat) {
    const cos = Math.cos((lat * Math.PI) / 180);
    return miles / (69.0 * Math.max(0.2, cos));
  }

  /**
   * Zoom map to a circular-ish region around a point (default ~35 mi radius).
   * @param {number} lat
   * @param {number} lng
   * @param {number} [radiusMiles]
   * @param {{ animate?: boolean }} [opts]
   */
  function focusAreaAround(lat, lng, radiusMiles = LOCAL_AREA_RADIUS_MI, opts = {}) {
    if (!state.map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const r = Math.max(15, Math.min(55, radiusMiles));
    const dLat = milesToLatDelta(r);
    const dLng = milesToLngDelta(r, lat);
    const bounds = L.latLngBounds(
      [lat - dLat, lng - dLng],
      [lat + dLat, lng + dLng]
    );
    state.map.fitBounds(bounds, {
      animate: opts.animate !== false,
      padding: [28, 28],
      maxZoom: 11,
    });
    persistMapView();
  }

  function persistMapView() {
    if (!state.map) return;
    const c = state.map.getCenter();
    const z = state.map.getZoom();
    Storage.saveSettings({
      lastMapView: { lat: c.lat, lng: c.lng, zoom: z, savedAt: Date.now() },
    });
  }

  function restoreLastMapView() {
    const v = Storage.loadSettings().lastMapView;
    if (!v || !Number.isFinite(v.lat) || !Number.isFinite(v.lng)) return false;
    // Prefer restoring a local area around last center rather than a zoomed-out continent
    if (v.zoom && v.zoom >= 8) {
      state.map.setView([v.lat, v.lng], Math.min(12, Math.max(9, v.zoom)));
    } else {
      focusAreaAround(v.lat, v.lng, LOCAL_AREA_RADIUS_MI, { animate: false });
    }
    return true;
  }

  /**
   * On app start: GPS → ~35 mi area + live cameras; fallback last view / US default.
   * Also pre-fills Start when empty so trip planning is one field away.
   */
  function autoFocusCurrentArea() {
    if (!state.map) return;

    const finish = () => {
      setLoading(false);
      refreshCamerasForView(false);
      updateMapEmpty();
    };

    if (!navigator.geolocation) {
      if (!restoreLastMapView()) {
        // Rough eastern-US work-trip fallback (not whole continent)
        focusAreaAround(39.0, -82.5, 45, { animate: false });
      }
      finish();
      return;
    }

    setLoading(true, "Centering on your area…");
    setLoadingStep("geo");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // Accuracy-based radius: tighter when GPS is good, up to ~50 mi when coarse
          const accM = pos.coords.accuracy || 5000;
          let radiusMi = LOCAL_AREA_RADIUS_MI;
          if (accM > 20000) radiusMi = 50;
          else if (accM < 100) radiusMi = 28;

          focusAreaAround(lat, lng, radiusMi, { animate: true });

          // Prefill start if user hasn't entered one
          if (!state.start && !els.startInput?.value?.trim()) {
            try {
              setFieldLoading("start", true);
              const place = await Geocoding.reverse(lat, lng);
              state.start = place;
              els.startInput.value = place.display_name;
              clearFieldError("start");
              setEndpoints(state.start, state.end);
            } catch {
              state.start = {
                lat,
                lng,
                display_name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                type: "gps",
              };
              els.startInput.value = state.start.display_name;
              setEndpoints(state.start, state.end);
            } finally {
              setFieldLoading("start", false);
            }
          }

          showToast(`Map set to ~${Math.round(radiusMi)} mi around your location`, "success");
        } finally {
          finish();
        }
      },
      (err) => {
        console.warn("Auto-locate failed", err);
        if (!restoreLastMapView()) {
          focusAreaAround(39.0, -82.5, 45, { animate: false });
        }
        if (err.code === 1) {
          showToast("Location denied — using last map area. Enable GPS for auto-center.", "error");
        }
        finish();
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }

  // ---------- Map ----------
  function initMap() {
    // Temporary center; autoFocusCurrentArea replaces this immediately after boot
    const saved = Storage.loadSettings().lastMapView;
    const startLat = saved?.lat ?? 39.0;
    const startLng = saved?.lng ?? -82.5;
    const startZoom = saved?.zoom && saved.zoom >= 8 ? Math.min(11, saved.zoom) : 9;

    state.map = L.map("map", {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true, // polylines/circles use canvas — much less memory on mobile
    }).setView([startLat, startLng], startZoom);

    L.control.zoom({ position: "bottomright" }).addTo(state.map);

    // Dark tiles — CartoDB Dark Matter
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(state.map);

    state.layers.cameras = L.layerGroup().addTo(state.map);
    state.layers.buffers = L.layerGroup();
    state.layers.standard = L.layerGroup().addTo(state.map);
    state.layers.avoid = L.layerGroup().addTo(state.map);
    state.layers.vias = L.layerGroup().addTo(state.map);
    state.layers.preview = L.layerGroup().addTo(state.map);

    // Live OSM load when map settles (debounced)
    state.map.on(
      "moveend",
      debounce(() => {
        persistMapView();
        if (!state.lastPlan) refreshCamerasForView(false);
      }, 550)
    );

    // Long-press / right-click to drop start or end (disabled during report pick)
    let pressTimer = null;
    let pressLatLng = null;
    state.map.on("contextmenu", (e) => {
      L.DomEvent.preventDefault(e.originalEvent);
      if (state.reportPickMode) {
        applyReportPick(e.latlng);
        return;
      }
      dropMapPin(e.latlng);
    });
    state.map.on("click", (e) => {
      if (state.reportPickMode) {
        applyReportPick(e.latlng);
      }
    });
    state.map.on("mousedown", (e) => {
      if (state.reportPickMode) return;
      if (e.originalEvent.button !== 0) return;
      pressLatLng = e.latlng;
      pressTimer = setTimeout(() => {
        if (pressLatLng) dropMapPin(pressLatLng);
        pressLatLng = null;
      }, 550);
    });
    const clearPress = () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      pressLatLng = null;
    };
    state.map.on("mouseup", clearPress);
    state.map.on("mousemove", (e) => {
      if (!pressTimer || !pressLatLng) return;
      if (pressLatLng.distanceTo(e.latlng) > 12) clearPress();
    });
    state.map.on("dragstart", clearPress);
  }

  async function dropMapPin(latlng) {
    const place = {
      lat: latlng.lat,
      lng: latlng.lng,
      display_name: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`,
      type: "map-pin",
    };
    try {
      setFieldLoading("start", !state.start);
      setFieldLoading("end", Boolean(state.start) && !state.end);
      const rev = await Geocoding.reverse(latlng.lat, latlng.lng);
      place.display_name = rev.display_name;
    } catch {
      /* keep coords label */
    } finally {
      setFieldLoading("start", false);
      setFieldLoading("end", false);
    }

    if (!state.start || (state.start && state.end)) {
      // New pair starts at this pin if both already set, or first pin
      if (state.start && state.end) {
        state.start = place;
        state.end = null;
        state.userVias = [];
        state.lastPlan = null;
        els.startInput.value = place.display_name;
        els.endInput.value = "";
        clearFieldError("start");
        clearFieldError("end");
        setEndpoints(state.start, null);
        clearRoutes();
        updateMapEmpty();
        showToast("Start set — drop or type a destination", "success");
        return;
      }
      state.start = place;
      els.startInput.value = place.display_name;
      clearFieldError("start");
      setEndpoints(state.start, state.end);
      showToast("Start pin set", "success");
    } else {
      state.end = place;
      els.endInput.value = place.display_name;
      clearFieldError("end");
      setEndpoints(state.start, state.end);
      showToast("End pin set — calculating…", "success");
      await runPlan({ preserveVias: false });
    }
    updateMapEmpty();
  }

  function boundsFromMap() {
    const b = state.map.getBounds();
    return {
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLng: b.getWest(),
      maxLng: b.getEast(),
    };
  }

  function updateOsmStatusText() {
    if (!els.osmStatus) return;
    if (!state.useLiveOsm) {
      els.osmStatus.textContent = "Live OSM off — using mock and/or your reports only.";
      return;
    }
    if (typeof OverpassCameras === "undefined") {
      els.osmStatus.textContent = "Live module missing.";
      return;
    }
    const st = OverpassCameras.getStatus();
    if (st.error && !st.ok) {
      els.osmStatus.textContent = `Live: ${st.error}`;
      return;
    }
    if (st.ok) {
      const src = st.source === "cache" ? "cached" : st.source || "OSM";
      els.osmStatus.textContent = `Live: ${st.count} ALPR point${st.count === 1 ? "" : "s"} (${src}). Mapped by OSM contributors — not 100% complete.`;
      return;
    }
    els.osmStatus.textContent = "Live data idle — pan the map or plan a route to load cameras.";
  }

  function clampCorridorBounds(bounds) {
    if (typeof OverpassCameras !== "undefined" && OverpassCameras.clampBounds) {
      return OverpassCameras.clampBounds(bounds);
    }
    return bounds;
  }

  /**
   * Collect cameras for routing/map: live OSM + optional mock + community.
   * Hard-capped for mobile memory.
   * @param {object} bounds
   * @param {{forceLive?: boolean, signal?: AbortSignal, forRouting?: boolean}} [opts]
   */
  async function collectCameras(bounds, opts = {}) {
    const parts = [];
    const safeBounds = clampCorridorBounds(bounds);

    if (state.useLiveOsm && typeof OverpassCameras !== "undefined") {
      try {
        const live = await OverpassCameras.fetchInBounds(safeBounds, {
          force: opts.forceLive,
          signal: opts.signal,
          pad: 0.012,
        });
        state.lastOsmCameras = live;
        parts.push(...live);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("Live OSM fetch failed", err);
          showToast(friendlyError(err, "Could not load live OSM cameras"), "error");
        }
      }
      updateOsmStatusText();
    }

    if (state.useMockData) {
      // Density 6 keeps procedural fill tiny
      parts.push(...CameraData.getCamerasInBounds(safeBounds, 6));
    }

    if (state.showCommunity) {
      parts.push(...Storage.reportsAsCameras(safeBounds));
    }

    const rank = (c) => {
      if (c.community || c.source === "community") return 0;
      if (c.live || c.source === "openstreetmap") return 1;
      return 2;
    };
    parts.sort((a, b) => rank(a) - rank(b));
    const seen = new Set();
    const out = [];
    const cap = opts.forRouting ? MAX_ROUTE_CAMERAS : MAX_MAP_MARKERS;
    for (const c of parts) {
      const key = c.id || `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;
      if (seen.has(key)) continue;
      const geo = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
      if (seen.has(geo)) continue;
      seen.add(key);
      seen.add(geo);
      out.push(c);
      if (out.length >= cap) break;
    }
    return out;
  }

  async function refreshCamerasForView(force = false) {
    if (!state.map || state.lastPlan) return; // while a plan is active, cameras are set by plan
    if (state.osmFetchAbort) {
      try {
        state.osmFetchAbort.abort();
      } catch {
        /* ignore */
      }
    }
    state.osmFetchAbort = new AbortController();
    try {
      if (els.osmStatus && state.useLiveOsm) {
        els.osmStatus.textContent = "Loading live OSM cameras…";
      }
      const cameras = await collectCameras(boundsFromMap(), {
        forceLive: force,
        signal: state.osmFetchAbort.signal,
      });
      state.cameras = cameras;
      renderCameraMarkers(cameras, new Set());
      updateOsmStatusText();
    } catch (err) {
      if (err.name !== "AbortError") console.warn(err);
    }
  }

  function cameraIcon(nearRoute, cam) {
    const community = cam?.community || cam?.source === "community";
    const mock =
      cam?.source === "procedural-demo" ||
      cam?.source === "mock-corridor" ||
      cam?.source === "corridor-mock" ||
      cam?.source === "placeholder" ||
      cam?.source === "community-pattern";
    const cls = [
      "camera-marker",
      "camera-marker--lite",
      nearRoute ? "near-route" : "",
      community ? "community" : "",
      mock && !community ? "mock" : "",
    ]
      .filter(Boolean)
      .join(" ");
    // Minimal DOM — full SVG icons were a major mobile memory cost at scale
    return L.divIcon({
      className: "",
      html: `<div class="${cls}"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -8],
    });
  }

  /** Prefer near-route / community cameras when we must drop markers */
  function prioritizeCamerasForDisplay(cameras, highlightIds) {
    if (!cameras || cameras.length <= MAX_MAP_MARKERS) return cameras || [];
    const hi = highlightIds || new Set();
    const ranked = cameras.slice().sort((a, b) => {
      const sa =
        (hi.has(a.id) ? 0 : 2) +
        (a.community || a.source === "community" ? 0 : 1) +
        (a.live || a.source === "openstreetmap" ? 0 : 1);
      const sb =
        (hi.has(b.id) ? 0 : 2) +
        (b.community || b.source === "community" ? 0 : 1) +
        (b.live || b.source === "openstreetmap" ? 0 : 1);
      return sa - sb;
    });
    return ranked.slice(0, MAX_MAP_MARKERS);
  }

  function endpointIcon(kind, label) {
    return L.divIcon({
      className: "endpoint-div-icon",
      html: `<div class="endpoint-marker ${kind}" title="Drag to move">${label}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  function viaIcon() {
    return L.divIcon({
      className: "via-div-icon",
      html: `<div class="via-handle" title="Drag to reshape avoid route"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  function sampleViasFromCoords(coords, count = 3) {
    if (!coords || coords.length < 4) return [];
    const out = [];
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const idx = Math.min(coords.length - 2, Math.max(1, Math.round(t * (coords.length - 1))));
      out.push({ lat: coords[idx][0], lng: coords[idx][1] });
    }
    return out;
  }

  function clearRoutes() {
    state.layers.standard?.clearLayers();
    state.layers.avoid?.clearLayers();
    state.layers.vias?.clearLayers();
    state.layers.preview?.clearLayers();
  }

  function updateMapEmpty() {
    if (!els.mapEmpty) return;
    const hasRoute = Boolean(state.lastPlan?.avoid?.coords?.length || state.lastPlan?.standard?.coords?.length);
    els.mapEmpty.hidden = hasRoute || (state.start && state.end);
    if (state.start && !state.end) {
      const p = els.mapEmpty.querySelector("p.text-sm");
      if (p) p.textContent = "Set a destination";
    } else if (!hasRoute) {
      const p = els.mapEmpty.querySelector("p.text-sm");
      if (p) p.textContent = "Plan a private drive";
    }
  }

  function setDragChip(on, text) {
    if (!els.dragChip) return;
    els.dragChip.hidden = !on;
    if (text) els.dragChip.textContent = text;
  }

  function updatePreviewLine() {
    state.layers.preview.clearLayers();
    if (!state.start || !state.end) return;
    const pts = [
      [state.start.lat, state.start.lng],
      ...((state._dragVias || state.userVias || []).map((v) => [v.lat, v.lng])),
      [state.end.lat, state.end.lng],
    ];
    L.polyline(pts, {
      color: "#3dd68c",
      weight: 3,
      opacity: 0.45,
      dashArray: "6 8",
      className: "route-line-preview",
      interactive: false,
    }).addTo(state.layers.preview);
  }

  function renderCameraMarkers(cameras, highlightIds) {
    // Full clear before rebuild — avoids stacking thousands of layers on refresh
    state.layers.cameras.clearLayers();
    state.layers.buffers.clearLayers();

    const hi = highlightIds || new Set();
    const list = prioritizeCamerasForDisplay(
      (cameras || []).filter((c) => !(c.community && !state.showCommunity)),
      hi
    );

    let bufferCount = 0;

    list.forEach((cam) => {
      const near = hi.has(cam.id);
      const marker = L.marker([cam.lat, cam.lng], {
        icon: cameraIcon(near, cam),
        keyboard: false,
        title: cam.name,
        riseOnHover: true,
      });

      // Bind popup lazily — one HTML string only when opened (saves RAM)
      marker.bindPopup(() => {
        const region = cam.region ? ` · ${escapeHtml(cam.region)}` : "";
        const conf = cam.confidence
          ? `<br/><span style="color:#6b8578;font-size:11px">Confidence: ${escapeHtml(cam.confidence)}</span>`
          : "";
        const notes = cam.notes
          ? `<br/><span style="color:#9fb5a8;font-size:11px">${escapeHtml(cam.notes)}</span>`
          : "";
        const mfr =
          cam.manufacturer || cam.operator
            ? `<br/><span style="color:#6b8578;font-size:11px">${escapeHtml(
                [cam.manufacturer, cam.operator].filter(Boolean).join(" · ")
              )}</span>`
            : "";
        const osmLink = cam.osmId
          ? `<br/><a href="https://www.openstreetmap.org/${cam.osmType || "node"}/${cam.osmId}" target="_blank" rel="noopener" style="color:#3dd68c;font-size:11px">View on OSM</a>`
          : "";
        const del =
          cam.community || cam.source === "community"
            ? `<br/><button type="button" class="popup-del-report" data-report-id="${escapeHtml(
                cam.id
              )}" style="margin-top:6px;font-size:11px;color:#fca5a5;background:none;border:none;cursor:pointer;padding:0;text-decoration:underline">Remove report</button>`
            : "";
        const sourceLabel =
          cam.source === "openstreetmap"
            ? "OpenStreetMap (live)"
            : cam.source === "community"
              ? "Your report"
              : escapeHtml(cam.source || "unknown");
        return `<strong>${escapeHtml(cam.name)}</strong><br/>
         <span style="color:#9fb5a8">${escapeHtml(cam.type)}${region}</span><br/>
         <span style="color:#6b8578;font-size:11px">Source: ${sourceLabel}</span>${mfr}${conf}${notes}${osmLink}${del}`;
      });

      marker.on("popupopen", () => {
        const btn = document.querySelector(`.popup-del-report[data-report-id="${cam.id}"]`);
        btn?.addEventListener("click", () => {
          Storage.removeReport(cam.id);
          marker.closePopup();
          refreshCommunityUI();
          refreshCamerasAfterReportChange();
          showToast("Community report removed", "success");
        });
      });
      state.layers.cameras.addLayer(marker);

      // Buffers only for near-route / community, hard-capped (circles are expensive)
      if (
        state.showBuffers &&
        bufferCount < MAX_BUFFER_CIRCLES &&
        (near || cam.community || cam.source === "community")
      ) {
        const isCommunity = cam.community || cam.source === "community";
        const color = near ? "#f5a623" : isCommunity ? "#a78bfa" : "#ef4444";
        L.circle([cam.lat, cam.lng], {
          radius: state.bufferMeters,
          color,
          weight: 1,
          opacity: 0.4,
          fillColor: color,
          fillOpacity: 0.05,
          interactive: false,
        }).addTo(state.layers.buffers);
        bufferCount++;
      }
    });

    if (cameras && cameras.length > list.length && els.osmStatus) {
      // Soft note only; don't thrash toast on every pan
      const st = typeof OverpassCameras !== "undefined" ? OverpassCameras.getStatus() : null;
      if (st?.ok) {
        els.osmStatus.textContent = `Live: showing ${list.length} of ${cameras.length} cameras (capped for device memory).`;
      }
    }
  }

  async function refreshCamerasAfterReportChange() {
    if (state.lastPlan && state.start && state.end) {
      await runPlan({ preserveVias: true, quiet: true });
      return;
    }
    if (state.map) {
      await refreshCamerasForView(true);
    }
  }

  function refreshCommunityUI() {
    const reports = Storage.loadReports();
    if (els.reportCount) els.reportCount.textContent = String(reports.length);
    if (!els.communityList) return;
    els.communityList.innerHTML = "";
    els.communityEmpty?.classList.toggle("hidden", reports.length > 0);

    reports.slice(0, 40).forEach((r) => {
      const row = document.createElement("div");
      row.className = "report-item";
      row.innerHTML = `
        <div class="min-w-0 flex-1" data-focus-report="${escapeHtml(r.id)}">
          <p class="text-xs font-medium truncate">${escapeHtml(r.name)}</p>
          <p class="text-[10px] text-flock-muted font-mono mt-0.5">
            ${escapeHtml(r.type)} · ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}
          </p>
        </div>
        <button type="button" class="btn-icon h-7 w-7 shrink-0" data-delete-report="${escapeHtml(r.id)}" title="Delete" aria-label="Delete report">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 01-2 2H9a2 2 0 01-2-2V6"/></svg>
        </button>`;
      row.querySelector(`[data-focus-report="${r.id}"]`)?.addEventListener("click", () => {
        state.map?.setView([r.lat, r.lng], 16);
        showToast("Centered on report", "success");
      });
      row.querySelector(`[data-delete-report="${r.id}"]`)?.addEventListener("click", (e) => {
        e.stopPropagation();
        Storage.removeReport(r.id);
        refreshCommunityUI();
        refreshCamerasAfterReportChange();
        showToast("Report deleted", "success");
      });
      els.communityList.appendChild(row);
    });
  }

  function bindEndpointDrag(marker, kind) {
    marker.on("dragstart", () => {
      state.isDragging = true;
      setDragChip(true, kind === "start" ? "Dragging start…" : "Dragging end…");
      const el = marker.getElement()?.querySelector(".endpoint-marker");
      el?.classList.add("is-dragging");
      state.map.dragging.disable();
    });
    marker.on("drag", () => {
      const ll = marker.getLatLng();
      if (kind === "start" && state.start) {
        state.start = { ...state.start, lat: ll.lat, lng: ll.lng };
      } else if (kind === "end" && state.end) {
        state.end = { ...state.end, lat: ll.lat, lng: ll.lng };
      }
      updatePreviewLine();
    });
    marker.on("dragend", async () => {
      state.map.dragging.enable();
      const el = marker.getElement()?.querySelector(".endpoint-marker");
      el?.classList.remove("is-dragging");
      state.isDragging = false;
      setDragChip(false);
      state.layers.preview.clearLayers();

      const ll = marker.getLatLng();
      const place = {
        lat: ll.lat,
        lng: ll.lng,
        display_name: `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`,
        type: "dragged",
      };
      try {
        setFieldLoading(kind, true);
        const rev = await Geocoding.reverse(ll.lat, ll.lng);
        place.display_name = rev.display_name;
      } catch {
        /* keep coord label */
      } finally {
        setFieldLoading(kind, false);
      }

      if (kind === "start") {
        state.start = place;
        els.startInput.value = place.display_name;
        clearFieldError("start");
      } else {
        state.end = place;
        els.endInput.value = place.display_name;
        clearFieldError("end");
      }
      // Endpoint move invalidates previous via shaping relative to old path
      state.userVias = [];
      marker.setPopupContent(
        `<strong>${kind === "start" ? "Start" : "End"}</strong><br/>${escapeHtml(place.display_name)}`
      );
      if (state.start && state.end) {
        state.suppressFit = true;
        await runPlan({ preserveVias: false, quiet: true });
        state.suppressFit = false;
      } else {
        setEndpoints(state.start, state.end);
      }
    });
  }

  function setEndpoints(start, end) {
    if (state.layers.startMarker) {
      state.map.removeLayer(state.layers.startMarker);
      state.layers.startMarker = null;
    }
    if (state.layers.endMarker) {
      state.map.removeLayer(state.layers.endMarker);
      state.layers.endMarker = null;
    }
    if (start) {
      state.layers.startMarker = L.marker([start.lat, start.lng], {
        icon: endpointIcon("start", "A"),
        zIndexOffset: 600,
        draggable: true,
        autoPan: true,
        title: "Drag to move start",
      })
        .bindPopup(`<strong>Start</strong><br/>${escapeHtml(start.display_name || "")}<br/><span style="color:#6b8578;font-size:11px">Drag to move</span>`)
        .addTo(state.map);
      bindEndpointDrag(state.layers.startMarker, "start");
    }
    if (end) {
      state.layers.endMarker = L.marker([end.lat, end.lng], {
        icon: endpointIcon("end", "B"),
        zIndexOffset: 600,
        draggable: true,
        autoPan: true,
        title: "Drag to move end",
      })
        .bindPopup(`<strong>End</strong><br/>${escapeHtml(end.display_name || "")}<br/><span style="color:#6b8578;font-size:11px">Drag to move</span>`)
        .addTo(state.map);
      bindEndpointDrag(state.layers.endMarker, "end");
    }
  }

  function renderViaHandles(plan) {
    state.layers.vias.clearLayers();
    if (!plan?.avoid?.coords?.length) return;

    const vias =
      state.userVias?.length > 0
        ? state.userVias
        : sampleViasFromCoords(plan.avoid.coords, 3);

    vias.forEach((v, index) => {
      const marker = L.marker([v.lat, v.lng], {
        icon: viaIcon(),
        draggable: true,
        zIndexOffset: 450,
        autoPan: true,
        title: "Drag to reshape route",
      });

      marker.on("dragstart", () => {
        state.isDragging = true;
        setDragChip(true, "Reshaping avoid route…");
        marker.getElement()?.querySelector(".via-handle")?.classList.add("is-dragging");
        // Seed user vias from current handle positions
        if (!state.userVias?.length) {
          state.userVias = vias.map((p) => ({ lat: p.lat, lng: p.lng }));
        }
        state._dragVias = state.userVias.map((p) => ({ ...p }));
        state.map.dragging.disable();
      });

      marker.on("drag", () => {
        const ll = marker.getLatLng();
        if (!state._dragVias) state._dragVias = state.userVias.map((p) => ({ ...p }));
        state._dragVias[index] = { lat: ll.lat, lng: ll.lng };
        updatePreviewLine();
      });

      marker.on("dragend", async () => {
        state.map.dragging.enable();
        marker.getElement()?.querySelector(".via-handle")?.classList.remove("is-dragging");
        state.isDragging = false;
        setDragChip(false);
        state.layers.preview.clearLayers();
        const ll = marker.getLatLng();
        if (!state.userVias?.length) {
          state.userVias = vias.map((p) => ({ lat: p.lat, lng: p.lng }));
        }
        state.userVias[index] = { lat: ll.lat, lng: ll.lng };
        state._dragVias = null;
        state.suppressFit = true;
        await runPlan({ preserveVias: true, quiet: true });
        state.suppressFit = false;
      });

      // Double-click handle to remove that via
      marker.on("dblclick", async (e) => {
        L.DomEvent.stop(e);
        if (!state.userVias?.length) {
          state.userVias = vias.map((p) => ({ lat: p.lat, lng: p.lng }));
        }
        state.userVias.splice(index, 1);
        state.suppressFit = true;
        await runPlan({ preserveVias: true, quiet: true });
        state.suppressFit = false;
        showToast("Via removed", "success");
      });

      state.layers.vias.addLayer(marker);
    });
  }

  function drawRoutes(plan) {
    state.layers.standard.clearLayers();
    state.layers.avoid.clearLayers();
    state.layers.preview.clearLayers();

    const sameAsStandard =
      plan.avoid &&
      plan.standard &&
      Math.abs((plan.avoid.distance || 0) - (plan.standard.distance || 0)) < 40 &&
      plan.avoid.coords?.length &&
      plan.standard.coords?.length &&
      plan.avoid.coords.length === plan.standard.coords.length;

    if (plan.standard?.coords?.length) {
      const line = L.polyline(plan.standard.coords, {
        color: "#38bdf8",
        weight: 5,
        opacity: sameAsStandard ? 0.35 : 0.75,
        lineJoin: "round",
        lineCap: "round",
        dashArray: "10 8",
        interactive: false,
      });
      state.layers.standard.addLayer(line);
    }

    if (plan.avoid?.coords?.length) {
      const line = L.polyline(plan.avoid.coords, {
        color: "#3dd68c",
        weight: 6,
        opacity: 0.95,
        lineJoin: "round",
        lineCap: "round",
        // Smooth short kinks from GPS noise without inventing new branches
        smoothFactor: 1.2,
        interactive: true,
      });
      // Click on avoid route to add a via at nearest point
      line.on("click", async (e) => {
        L.DomEvent.stopPropagation(e);
        const ll = e.latlng;
        if (!state.userVias?.length) {
          state.userVias = sampleViasFromCoords(plan.avoid.coords, 2);
        }
        if (state.userVias.length >= 8) {
          showToast("Maximum of 8 vias — drag or double-click to remove", "error");
          return;
        }
        state.userVias.push({ lat: ll.lat, lng: ll.lng });
        state.suppressFit = true;
        await runPlan({ preserveVias: true, quiet: true });
        state.suppressFit = false;
        showToast("Via added — drag handles to refine", "success");
      });
      state.layers.avoid.addLayer(line);
    }

    renderViaHandles(plan);
  }

  /**
   * Zoom to planned route with padding.
   * Short routes expand to at least ~20 mi so the corridor (and nearby cameras) stay visible.
   * Long routes fit fully; max zoom capped so you still see surroundings.
   */
  function fitToPlan(plan) {
    if (!state.map || !plan) return;
    const all = [];
    if (plan.avoid?.coords?.length) all.push(...plan.avoid.coords);
    if (plan.standard?.coords?.length) all.push(...plan.standard.coords);
    if (state.start) all.push([state.start.lat, state.start.lng]);
    if (state.end) all.push([state.end.lat, state.end.lng]);
    if (!all.length) return;

    let bounds = L.latLngBounds(all);
    const center = bounds.getCenter();

    // Minimum visible span (~20 miles half-size → ~40 mi across)
    const minHalfMi = 12;
    const dLat = milesToLatDelta(minHalfMi);
    const dLng = milesToLngDelta(minHalfMi, center.lat);
    bounds = L.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
    bounds.extend([center.lat - dLat, center.lng - dLng]);
    bounds.extend([center.lat + dLat, center.lng + dLng]);

    // Modest pad — large pads caused giant bboxes + OOM on mobile Overpass loads
    const padLat = Math.min(0.08, Math.max(0.015, (bounds.getNorth() - bounds.getSouth()) * 0.08));
    const padLng = Math.min(0.08, Math.max(0.015, (bounds.getEast() - bounds.getWest()) * 0.08));
    bounds = L.latLngBounds(
      [bounds.getSouth() - padLat, bounds.getWest() - padLng],
      [bounds.getNorth() + padLat, bounds.getEast() + padLng]
    );

    state.map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 12,
      animate: true,
    });
    persistMapView();
  }

  // ---------- Stats UI ----------
  function updateStats(plan) {
    els.statsPanel.classList.remove("hidden");
    els.statsPanel.classList.add("stats-panel-enter");
    els.statsPanel.classList.remove("is-soft-loading");

    const score = plan.privacyScore;
    els.privacyScore.textContent = String(score);
    els.privacyLabel.textContent = Routing.privacyLabel(score);

    // Arc: circumference ≈ 2 * π * 34 ≈ 213.63
    const C = 2 * Math.PI * 34;
    const offset = C - (score / 100) * C;
    els.scoreArc.style.strokeDasharray = String(C);
    els.scoreArc.style.strokeDashoffset = String(offset);

    // Color by score
    let color = "#3dd68c";
    if (score < 30) color = "#ef4444";
    else if (score < 50) color = "#f5a623";
    else if (score < 70) color = "#eab308";
    els.scoreArc.style.color = color;
    els.privacyScore.style.color = color;

    els.statAvoided.textContent = String(plan.avoidedCount);
    els.statOnStandard.textContent = String(plan.camsOnStandard.length);
    els.statRemaining.textContent = String(plan.camsOnAvoid.length);
    els.statExtraDist.textContent =
      plan.extraDist > 50 ? `+${Routing.formatDistance(plan.extraDist)}` : "~0";
    els.statExtraTime.textContent =
      plan.extraTime > 30 ? `+${Routing.formatDuration(plan.extraTime)}` : "~0";

    els.stdDistance.textContent = Routing.formatDistance(plan.standard.distance);
    els.stdDuration.textContent = Routing.formatDuration(plan.standard.duration);
    els.avoidDistance.textContent = Routing.formatDistance(plan.avoid.distance);
    els.avoidDuration.textContent = Routing.formatDuration(plan.avoid.duration);
  }

  // ---------- Planning ----------
  /**
   * @param {{ preserveVias?: boolean, quiet?: boolean }} [opts]
   */
  async function runPlan(opts = {}) {
    clearRouteError();
    clearFieldError("start");
    clearFieldError("end");

    if (!opts.preserveVias) {
      // Fresh plan from addresses resets manual shaping unless caller keeps vias
      // (drag-via calls pass preserveVias: true)
    }

    if (!state.start || !state.end) {
      try {
        setLoadingStep("geo");
        setLoading(true, "Looking up addresses…");
        await resolveInputsIfNeeded();
      } catch (err) {
        setLoading(false);
        const msg = friendlyError(err, "Enter valid start and end addresses");
        if (/start/i.test(msg)) setFieldError("start", msg);
        else if (/destin|end/i.test(msg)) setFieldError("end", msg);
        showRouteError(msg);
        showToast(msg, "error");
        return;
      }
    }

    if (!state.start || !state.end) {
      if (!state.start) setFieldError("start", "Enter a start address");
      if (!state.end) setFieldError("end", "Enter a destination");
      const msg = "Enter start and destination addresses";
      showRouteError(msg);
      showToast(msg, "error");
      return;
    }

    if (
      state.start.lat === state.end.lat &&
      state.start.lng === state.end.lng
    ) {
      const msg = "Start and end are the same point";
      showRouteError(msg);
      showToast(msg, "error");
      return;
    }

    const token = ++state.planToken;
    state.isPlanning = true;
    setRouteButtonLoading(true);
    setLoadingStep("route");
    setLoading(true, opts.quiet ? "Updating route…" : "Calculating privacy routes…");
    els.statsPanel?.classList.add("is-soft-loading");

    try {
      let bounds = {
        minLat: Math.min(state.start.lat, state.end.lat),
        maxLat: Math.max(state.start.lat, state.end.lat),
        minLng: Math.min(state.start.lng, state.end.lng),
        maxLng: Math.max(state.start.lng, state.end.lng),
      };
      // Corridor pad — capped so long trips don't load half a state into memory
      const padLat = Math.min(0.12, Math.max(0.04, (bounds.maxLat - bounds.minLat) * 0.2));
      const padLng = Math.min(0.12, Math.max(0.04, (bounds.maxLng - bounds.minLng) * 0.2));
      bounds = {
        minLat: bounds.minLat - padLat,
        maxLat: bounds.maxLat + padLat,
        minLng: bounds.minLng - padLng,
        maxLng: bounds.maxLng + padLng,
      };
      bounds = clampCorridorBounds(bounds);

      setLoading(true, state.useLiveOsm ? "Loading live OSM cameras…" : "Loading cameras…");
      const cameras = await collectCameras(bounds, { forceLive: false, forRouting: true });
      state.cameras = cameras;

      setLoadingStep("score");
      setLoading(
        true,
        cameras.length
          ? `Scoring ${cameras.length} cameras…`
          : "Scoring camera exposure…"
      );

      if (opts.preserveVias === false) {
        state.userVias = [];
      }
      const userWaypoints = state.userVias?.length ? state.userVias : undefined;

      const plan = await Routing.planRoutes(
        state.start,
        state.end,
        state.bufferMeters,
        cameras,
        { userWaypoints }
      );

      // Ignore stale plans if a newer run started
      if (token !== state.planToken) return;

      state.lastPlan = plan;

      setEndpoints(state.start, state.end);
      drawRoutes(plan);

      const highlight = new Set([
        ...plan.camsOnStandard.map((c) => c.id),
        ...plan.camsOnAvoid.map((c) => c.id),
      ]);
      renderCameraMarkers(cameras, highlight);
      updateStats(plan);
      updateMapEmpty();

      if (!state.suppressFit) {
        fitToPlan(plan);
      }

      const note =
        plan.standard.source === "fallback" || plan.avoid.source === "fallback"
          ? " · approximate geometry"
          : "";
      const shaped = plan.avoid?.userShaped ? " · custom shape" : "";
      if (!opts.quiet) {
        showToast(
          `Routes ready — avoided ${plan.avoidedCount} camera${plan.avoidedCount === 1 ? "" : "s"}${shaped}${note}`,
          "success"
        );
      } else {
        showToast(`Route updated${shaped}${note}`, "success");
      }
    } catch (err) {
      if (token !== state.planToken) return;
      console.error(err);
      const msg = friendlyError(err, "Failed to calculate routes");
      showRouteError(msg, true);
      showToast(msg, "error");
    } finally {
      if (token === state.planToken) {
        state.isPlanning = false;
        setLoading(false);
        setRouteButtonLoading(false);
        els.statsPanel?.classList.remove("is-soft-loading");
      }
    }
  }

  async function resolveInputsIfNeeded() {
    if (!state.start && els.startInput.value.trim().length >= 3) {
      setFieldLoading("start", true);
      try {
        const results = await Geocoding.search(els.startInput.value.trim(), { limit: 1 });
        if (!results.length) throw new Error("Could not find start address");
        state.start = results[0];
        els.startInput.value = results[0].display_name;
      } finally {
        setFieldLoading("start", false);
      }
    }
    if (!state.end && els.endInput.value.trim().length >= 3) {
      setFieldLoading("end", true);
      try {
        const results = await Geocoding.search(els.endInput.value.trim(), { limit: 1 });
        if (!results.length) throw new Error("Could not find destination");
        state.end = results[0];
        els.endInput.value = results[0].display_name;
      } finally {
        setFieldLoading("end", false);
      }
    }
  }

  async function replanIfReady() {
    if (state.start && state.end && state.lastPlan) {
      await runPlan({ preserveVias: true, quiet: true });
    } else if (state.lastPlan) {
      const highlight = new Set([
        ...(state.lastPlan.camsOnStandard || []).map((c) => c.id),
        ...(state.lastPlan.camsOnAvoid || []).map((c) => c.id),
      ]);
      renderCameraMarkers(state.cameras, highlight);
    }
  }

  // ---------- Autocomplete ----------
  function setupAutocomplete(input, listEl, onPick, fieldKey) {
    const ac = Geocoding.createAutocomplete((results, meta) => {
      setFieldLoading(fieldKey, false);
      if (meta?.error) {
        renderSuggestions(listEl, [], null, {
          error: "Search failed — check your connection and try again",
        });
        return;
      }
      renderSuggestions(
        listEl,
        results,
        (item) => {
          input.value = item.display_name;
          hideSuggestions(listEl);
          clearFieldError(fieldKey);
          onPick(item);
        },
        {
          empty:
            input.value.trim().length >= 3
              ? "No places found — try a more specific address"
              : null,
        }
      );
    });

    // Wrap to show spinner while querying
    const origQuery = ac.query.bind(ac);
    ac.query = (text) => {
      if ((text || "").trim().length >= 3) setFieldLoading(fieldKey, true);
      else setFieldLoading(fieldKey, false);
      origQuery(text);
    };

    input.addEventListener("input", () => {
      onPick(null); // clear resolved place until re-picked
      clearFieldError(fieldKey);
      ac.query(input.value);
    });

    input.addEventListener("focus", () => {
      if (input.value.trim().length >= 3) ac.query(input.value);
    });

    input.addEventListener("blur", () => {
      // Keep spinner off if user leaves without results event
      setTimeout(() => setFieldLoading(fieldKey, false), 400);
    });

    input.addEventListener("keydown", (e) => {
      const items = [...listEl.querySelectorAll("li")];
      const selected = listEl.querySelector('li[aria-selected="true"]');
      let idx = items.indexOf(selected);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        idx = Math.min(items.length - 1, idx + 1);
        items.forEach((li, i) => li.setAttribute("aria-selected", i === idx ? "true" : "false"));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        idx = Math.max(0, idx - 1);
        items.forEach((li, i) => li.setAttribute("aria-selected", i === idx ? "true" : "false"));
      } else if (e.key === "Enter") {
        if (selected) {
          e.preventDefault();
          selected.click();
        }
      } else if (e.key === "Escape") {
        hideSuggestions(listEl);
      }
    });

    document.addEventListener("click", (e) => {
      if (!listEl.contains(e.target) && e.target !== input) hideSuggestions(listEl);
    });
  }

  function renderSuggestions(listEl, results, onSelect, meta = {}) {
    listEl.innerHTML = "";
    if (meta.error) {
      const li = document.createElement("li");
      li.className = "sug-error";
      li.textContent = meta.error;
      listEl.appendChild(li);
      listEl.hidden = false;
      return;
    }
    if (!results.length) {
      if (meta.empty) {
        const li = document.createElement("li");
        li.className = "sug-empty";
        li.textContent = meta.empty;
        listEl.appendChild(li);
        listEl.hidden = false;
        return;
      }
      hideSuggestions(listEl);
      return;
    }
    results.forEach((item, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === 0 ? "true" : "false");
      li.innerHTML = `<span class="sug-type">${escapeHtml(item.type)}</span>${escapeHtml(item.display_name)}`;
      li.addEventListener("click", () => onSelect(item));
      listEl.appendChild(li);
    });
    listEl.hidden = false;
  }

  function hideSuggestions(listEl) {
    listEl.hidden = true;
    listEl.innerHTML = "";
  }

  // ---------- Saved routes ----------
  function openSavedModal() {
    renderSavedList();
    els.savedModal.hidden = false;
  }

  function closeSavedModal() {
    els.savedModal.hidden = true;
  }

  function renderSavedList() {
    const routes = Storage.loadRoutes();
    els.savedList.innerHTML = "";
    els.savedEmpty.classList.toggle("hidden", routes.length > 0);

    routes.forEach((r) => {
      const btn = document.createElement("div");
      btn.className = "saved-item";
      btn.innerHTML = `
        <div class="min-w-0 flex-1" data-load="${r.id}">
          <p class="text-sm font-medium truncate">${escapeHtml(r.name)}</p>
          <p class="text-[11px] text-flock-muted mt-0.5 font-mono">
            Buffer ${r.bufferMeters}m
            ${r.stats?.privacyScore != null ? ` · Score ${r.stats.privacyScore}` : ""}
            · ${formatDate(r.createdAt)}
          </p>
        </div>
        <div class="saved-actions">
          <button type="button" class="btn-icon h-8 w-8" data-delete="${r.id}" title="Delete" aria-label="Delete route">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 01-2 2H9a2 2 0 01-2-2V6"/></svg>
          </button>
        </div>
      `;
      btn.querySelector(`[data-load="${r.id}"]`).addEventListener("click", () => loadSavedRoute(r));
      btn.querySelector(`[data-delete="${r.id}"]`).addEventListener("click", (e) => {
        e.stopPropagation();
        Storage.removeRoute(r.id);
        renderSavedList();
        showToast("Route deleted", "success");
      });
      els.savedList.appendChild(btn);
    });
  }

  async function loadSavedRoute(r) {
    closeSavedModal();
    state.start = r.start;
    state.end = r.end;
    state.userVias = [];
    state.bufferMeters = r.bufferMeters || 150;
    els.startInput.value = r.start?.display_name || "";
    els.endInput.value = r.end?.display_name || "";
    els.bufferSlider.value = String(state.bufferMeters);
    els.bufferValue.textContent = `${state.bufferMeters} m`;
    els.bufferSlider.setAttribute("aria-valuenow", String(state.bufferMeters));
    clearFieldError("start");
    clearFieldError("end");
    await runPlan({ preserveVias: false });
  }

  function saveCurrentRoute() {
    if (!state.start || !state.end || !state.lastPlan) {
      showToast("Plan a route before saving", "error");
      return;
    }
    Storage.addRoute({
      start: state.start,
      end: state.end,
      bufferMeters: state.bufferMeters,
      stats: {
        privacyScore: state.lastPlan.privacyScore,
        avoidedCount: state.lastPlan.avoidedCount,
        onStandard: state.lastPlan.camsOnStandard.length,
        onAvoid: state.lastPlan.camsOnAvoid.length,
        extraDist: state.lastPlan.extraDist,
        extraTime: state.lastPlan.extraTime,
      },
    });
    showToast("Route saved on this device", "success");
  }

  // ---------- Utils / loading / errors ----------
  function setLoading(on, text) {
    els.loading.classList.toggle("hidden", !on);
    if (els.mapProgress) els.mapProgress.hidden = !on;
    if (text && els.loadingText) els.loadingText.textContent = text;
    document.body.classList.toggle("app-loading", on);
  }

  function setLoadingStep(step) {
    if (!els.loadingSteps) return;
    const order = ["geo", "route", "score"];
    const idx = order.indexOf(step);
    els.loadingSteps.querySelectorAll("[data-step]").forEach((el) => {
      const s = el.getAttribute("data-step");
      const si = order.indexOf(s);
      el.classList.toggle("active", s === step);
      el.classList.toggle("done", si >= 0 && si < idx);
    });
  }

  function setRouteButtonLoading(on) {
    els.btnRoute.disabled = on;
    els.btnRoute.classList.toggle("is-loading", on);
    els.btnRoute.setAttribute("aria-busy", on ? "true" : "false");
  }

  function setFieldLoading(field, on) {
    const wrap = field === "start" ? els.startWrap : field === "end" ? els.endWrap : null;
    const spin = field === "start" ? els.startSpinner : field === "end" ? els.endSpinner : null;
    wrap?.classList.toggle("is-loading", on);
    if (spin) spin.hidden = !on;
  }

  function setFieldError(field, message) {
    const wrap = field === "start" ? els.startWrap : els.endWrap;
    const err = field === "start" ? els.startError : els.endError;
    wrap?.classList.add("has-error");
    if (err) {
      err.hidden = !message;
      err.textContent = message || "";
    }
  }

  function clearFieldError(field) {
    const wrap = field === "start" ? els.startWrap : els.endWrap;
    const err = field === "start" ? els.startError : els.endError;
    wrap?.classList.remove("has-error");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
  }

  function showRouteError(message, canRetry = true) {
    if (!els.routeError) return;
    els.routeError.hidden = false;
    if (els.routeErrorText) els.routeErrorText.textContent = message;
    if (els.btnRouteRetry) els.btnRouteRetry.hidden = !canRetry;
  }

  function clearRouteError() {
    if (els.routeError) els.routeError.hidden = true;
  }

  function friendlyError(err, fallback) {
    if (!navigator.onLine) {
      return "You’re offline. Check your connection and try again.";
    }
    const msg = (err && err.message) || String(err || "");
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(msg)) {
      return "Network error — geocoding or routing service unreachable.";
    }
    if (/429|rate/i.test(msg)) {
      return "Too many requests — wait a moment and retry.";
    }
    if (/No route|route found/i.test(msg)) {
      return "No driving route found between these points.";
    }
    return msg || fallback || "Something went wrong";
  }

  function updateOnlineStatus() {
    if (!els.offlineChip) return;
    els.offlineChip.hidden = navigator.onLine;
  }

  let toastTimer = null;
  function showToast(msg, type = "") {
    if (!els.toast) return;
    els.toast.hidden = false;
    els.toast.className = `toast${type ? " " + type : ""}`;
    els.toast.innerHTML = `<span class="toast-msg"></span><button type="button" class="toast-close" aria-label="Dismiss">×</button>`;
    els.toast.querySelector(".toast-msg").textContent = msg;
    els.toast.querySelector(".toast-close").onclick = () => {
      els.toast.hidden = true;
    };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, type === "error" ? 5200 : 3400);
  }
  // Expose for premium-ui.js
  window.__flockToast = showToast;

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  // ---------- Events ----------
  function bindEvents() {
    setupAutocomplete(
      els.startInput,
      els.startSug,
      (item) => {
        state.start = item;
        if (item) {
          state.userVias = [];
          setEndpoints(state.start, state.end);
          updateMapEmpty();
        }
      },
      "start"
    );
    setupAutocomplete(
      els.endInput,
      els.endSug,
      (item) => {
        state.end = item;
        if (item) {
          state.userVias = [];
          setEndpoints(state.start, state.end);
          updateMapEmpty();
        }
      },
      "end"
    );

    els.btnRoute.addEventListener("click", () => runPlan({ preserveVias: false }));
    els.btnRouteRetry?.addEventListener("click", () => runPlan({ preserveVias: true }));
    els.btnRouteErrorDismiss?.addEventListener("click", clearRouteError);

    async function loadDemo(start, end) {
      state.start = start;
      state.end = end;
      state.userVias = [];
      clearFieldError("start");
      clearFieldError("end");
      clearRouteError();
      els.startInput.value = start.display_name;
      els.endInput.value = end.display_name;
      await runPlan({ preserveVias: false });
    }

    const btnDemo = $("btn-demo");
    if (btnDemo) {
      btnDemo.addEventListener("click", () =>
        loadDemo(
          {
            lat: 30.2635,
            lng: -97.7395,
            display_name: "Austin Convention Center, Austin, Texas",
            type: "demo",
          },
          {
            lat: 30.2639,
            lng: -97.7713,
            display_name: "Barton Springs Pool, Austin, Texas",
            type: "demo",
          }
        )
      );
    }

    // Parkersburg WV → Athens OH — dense mock camera corridor
    const btnDemoWv = $("btn-demo-wv");
    if (btnDemoWv) {
      btnDemoWv.addEventListener("click", () =>
        loadDemo(
          {
            lat: 39.2667,
            lng: -81.5615,
            display_name: "Downtown Parkersburg, West Virginia",
            type: "demo",
          },
          {
            lat: 39.3292,
            lng: -82.1013,
            display_name: "Downtown Athens, Ohio",
            type: "demo",
          }
        )
      );
    }

    els.btnSwap.addEventListener("click", () => {
      const tmp = state.start;
      state.start = state.end;
      state.end = tmp;
      const tv = els.startInput.value;
      els.startInput.value = els.endInput.value;
      els.endInput.value = tv;
      state.userVias = [];
      clearFieldError("start");
      clearFieldError("end");
      setEndpoints(state.start, state.end);
      if (state.start && state.end) runPlan({ preserveVias: false });
    });

    els.btnLocate.addEventListener("click", () => {
      if (!navigator.geolocation) {
        showToast("Geolocation not supported on this device", "error");
        return;
      }
      els.btnLocate.classList.add("is-loading");
      setLoading(true, "Getting your location…");
      setLoadingStep("geo");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude: lat, longitude: lng } = pos.coords;
            const place = await Geocoding.reverse(lat, lng);
            state.start = place;
            state.userVias = [];
            els.startInput.value = place.display_name;
            clearFieldError("start");
            focusAreaAround(lat, lng, LOCAL_AREA_RADIUS_MI);
            setEndpoints(state.start, state.end);
            updateMapEmpty();
            showToast("Start set to your location", "success");
            if (state.end) await runPlan({ preserveVias: false, quiet: true });
            else await refreshCamerasForView(false);
          } catch (err) {
            state.start = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              display_name: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
            };
            els.startInput.value = state.start.display_name;
            focusAreaAround(state.start.lat, state.start.lng, LOCAL_AREA_RADIUS_MI);
            setEndpoints(state.start, state.end);
            updateMapEmpty();
            showToast("Start set (address lookup limited)", "success");
            await refreshCamerasForView(false);
          } finally {
            setLoading(false);
            els.btnLocate.classList.remove("is-loading");
          }
        },
        (err) => {
          setLoading(false);
          els.btnLocate.classList.remove("is-loading");
          let msg = "Location permission denied";
          if (err.code === 1) msg = "Location permission denied — enable it in browser settings";
          else if (err.code === 2) msg = "Location unavailable";
          else if (err.code === 3) msg = "Location request timed out";
          showToast(msg, "error");
          showRouteError(msg, false);
        },
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    // Buffer slider — live label; replan on change end
    els.bufferSlider.addEventListener("input", () => {
      state.bufferMeters = Number(els.bufferSlider.value);
      els.bufferValue.textContent = `${state.bufferMeters} m`;
      els.bufferSlider.setAttribute("aria-valuenow", String(state.bufferMeters));
      if (state.showBuffers && state.cameras.length) {
        const highlight = new Set([
          ...(state.lastPlan?.camsOnStandard || []).map((c) => c.id),
          ...(state.lastPlan?.camsOnAvoid || []).map((c) => c.id),
        ]);
        renderCameraMarkers(state.cameras, highlight);
      }
    });
    els.bufferSlider.addEventListener("change", () => {
      Storage.saveSettings({ bufferMeters: state.bufferMeters });
      replanIfReady();
    });

    els.btnSave.addEventListener("click", saveCurrentRoute);
    els.btnFit.addEventListener("click", () => {
      if (state.lastPlan) fitToPlan(state.lastPlan);
    });

    function setExportRoute(kind) {
      state.exportRoute = kind === "standard" ? "standard" : "avoid";
      els.exportRouteAvoid?.classList.toggle("export-route-tab--active", state.exportRoute === "avoid");
      els.exportRouteStandard?.classList.toggle(
        "export-route-tab--active",
        state.exportRoute === "standard"
      );
      updateExportHint();
    }

    function updateExportHint() {
      if (!els.exportHint) return;
      if (state.exportRoute === "standard") {
        els.exportHint.textContent =
          "Sends the standard route. Google/Apple get start, end, and sampled waypoints; Waze opens the destination.";
      } else {
        els.exportHint.textContent =
          "Sends the camera-avoiding route via waypoints. Apps may re-route slightly; Waze uses destination only.";
      }
    }

    function exportRouteTo(provider) {
      if (!state.start || !state.end) {
        showToast("Plan a route first", "error");
        return;
      }
      if (!state.lastPlan) {
        showToast("Calculate a route before exporting", "error");
        return;
      }
      const plan = state.lastPlan;
      const useAvoid = state.exportRoute === "avoid";
      const coords = useAvoid ? plan.avoid?.coords : plan.standard?.coords;
      try {
        const links = ExportMaps.exportTo(provider, {
          start: state.start,
          end: state.end,
          coords: coords || [],
          preferWaypoints: provider !== "waze",
        });
        const labels = { google: "Google Maps", apple: "Apple Maps", waze: "Waze" };
        const via =
          provider === "waze"
            ? "destination"
            : links.waypointsUsed
              ? `${links.waypointsUsed} waypoints`
              : "direct";
        showToast(`Opening ${labels[provider]} (${via})`, "success");
      } catch (err) {
        showToast(err.message || "Could not open maps", "error");
      }
    }

    els.exportRouteAvoid?.addEventListener("click", () => setExportRoute("avoid"));
    els.exportRouteStandard?.addEventListener("click", () => setExportRoute("standard"));
    els.btnExportGoogle?.addEventListener("click", () => exportRouteTo("google"));
    els.btnExportApple?.addEventListener("click", () => exportRouteTo("apple"));
    els.btnExportWaze?.addEventListener("click", () => exportRouteTo("waze"));
    updateExportHint();

    els.btnSaved.addEventListener("click", openSavedModal);
    els.savedModal.querySelectorAll("[data-close-modal]").forEach((el) => {
      el.addEventListener("click", closeSavedModal);
    });

    els.btnMenu.addEventListener("click", () => {
      els.sidebar.classList.toggle("collapsed");
      const open = !els.sidebar.classList.contains("collapsed");
      els.btnMenu.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Layers
    els.toggleCameras.addEventListener("change", () => {
      state.showCameras = els.toggleCameras.checked;
      if (state.showCameras) state.map.addLayer(state.layers.cameras);
      else state.map.removeLayer(state.layers.cameras);
    });
    els.toggleStandard.addEventListener("change", () => {
      state.showStandard = els.toggleStandard.checked;
      if (state.showStandard) state.map.addLayer(state.layers.standard);
      else state.map.removeLayer(state.layers.standard);
    });
    els.toggleAvoid.addEventListener("change", () => {
      state.showAvoid = els.toggleAvoid.checked;
      if (state.showAvoid) {
        state.map.addLayer(state.layers.avoid);
        state.map.addLayer(state.layers.vias);
      } else {
        state.map.removeLayer(state.layers.avoid);
        state.map.removeLayer(state.layers.vias);
      }
    });
    els.toggleBuffers.addEventListener("change", () => {
      state.showBuffers = els.toggleBuffers.checked;
      if (state.showBuffers) {
        state.map.addLayer(state.layers.buffers);
        const highlight = new Set([
          ...(state.lastPlan?.camsOnStandard || []).map((c) => c.id),
          ...(state.lastPlan?.camsOnAvoid || []).map((c) => c.id),
        ]);
        renderCameraMarkers(state.cameras, highlight);
      } else {
        state.map.removeLayer(state.layers.buffers);
        state.layers.buffers.clearLayers();
      }
    });
    els.toggleCommunity?.addEventListener("change", () => {
      state.showCommunity = els.toggleCommunity.checked;
      Storage.saveSettings({ showCommunity: state.showCommunity });
      refreshCamerasAfterReportChange();
    });
    els.toggleLiveOsm?.addEventListener("change", () => {
      state.useLiveOsm = els.toggleLiveOsm.checked;
      Storage.saveSettings({ useLiveOsm: state.useLiveOsm });
      updateOsmStatusText();
      refreshCamerasAfterReportChange();
    });
    els.toggleMockData?.addEventListener("change", () => {
      state.useMockData = els.toggleMockData.checked;
      Storage.saveSettings({ useMockData: state.useMockData });
      refreshCamerasAfterReportChange();
    });
    els.btnRefreshOsm?.addEventListener("click", async () => {
      if (typeof OverpassCameras !== "undefined") OverpassCameras.clearCache();
      if (state.lastPlan && state.start && state.end) {
        showToast("Refreshing live cameras & re-scoring route…", "success");
        await runPlan({ preserveVias: true, quiet: true });
      } else {
        showToast("Refreshing live OSM cameras…", "success");
        await refreshCamerasForView(true);
      }
    });

    // Community report form
    setupReportForm();

    // Enter to route
    [els.startInput, els.endInput].forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) {
          e.preventDefault();
          runPlan();
        }
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeSavedModal();
        if (state.reportPickMode) cancelReportPick();
        else closeReportModal();
      }
    });

    // Refresh premium panels when unlocks change (safety if UI loaded first)
    if (typeof Premium !== "undefined" && Premium.onChange) {
      Premium.onChange(() => {
        if (typeof PremiumUI !== "undefined") PremiumUI.renderFeatureList();
      });
    }
  }

  // ---------- Community report form ----------
  function openReportModal() {
    if (!els.reportModal) return;
    clearReportFormError();
    // Prefill coords from map center if empty
    if (state.map && (!els.reportLat.value || !els.reportLng.value)) {
      const c = state.map.getCenter();
      els.reportLat.value = c.lat.toFixed(6);
      els.reportLng.value = c.lng.toFixed(6);
      if (els.reportCoordsHint) {
        els.reportCoordsHint.textContent = "Prefilled from map center — adjust or pick on map.";
      }
    }
    els.reportModal.hidden = false;
    els.reportName?.focus();
  }

  function closeReportModal() {
    if (els.reportModal) els.reportModal.hidden = true;
    cancelReportPick(false);
  }

  function clearReportFormError() {
    if (els.reportFormError) {
      els.reportFormError.hidden = true;
      els.reportFormError.textContent = "";
    }
  }

  function showReportFormError(msg) {
    if (els.reportFormError) {
      els.reportFormError.hidden = false;
      els.reportFormError.textContent = msg;
    }
  }

  function startReportPick() {
    closeReportModal();
    state.reportPickMode = true;
    document.body.classList.add("report-pick-mode");
    if (els.reportPickChip) els.reportPickChip.hidden = false;
    showToast("Tap the map to place the camera", "success");
  }

  function cancelReportPick(reopen = true) {
    state.reportPickMode = false;
    document.body.classList.remove("report-pick-mode");
    if (els.reportPickChip) els.reportPickChip.hidden = true;
    if (reopen && els.reportModal && !els.reportLat?.value) {
      // keep closed if user cancelled without coords intent
    }
  }

  async function applyReportPick(latlng) {
    state.reportPickMode = false;
    document.body.classList.remove("report-pick-mode");
    if (els.reportPickChip) els.reportPickChip.hidden = true;

    els.reportLat.value = latlng.lat.toFixed(6);
    els.reportLng.value = latlng.lng.toFixed(6);

    try {
      const rev = await Geocoding.reverse(latlng.lat, latlng.lng);
      if (els.reportAddress && !els.reportAddress.value) {
        els.reportAddress.value = rev.display_name.split(",").slice(0, 3).join(",").trim();
      }
      if (els.reportName && !els.reportName.value.trim()) {
        els.reportName.value = rev.display_name.split(",")[0].trim().slice(0, 80);
      }
    } catch {
      /* optional */
    }

    if (els.reportCoordsHint) {
      els.reportCoordsHint.textContent = "Location set from map pin.";
    }
    openReportModal();
    showToast("Location set — finish and save the report", "success");
  }

  function setupReportForm() {
    const open = () => openReportModal();
    els.btnReport?.addEventListener("click", open);
    els.btnReportOpen?.addEventListener("click", open);
    els.reportModal?.querySelectorAll("[data-close-report]").forEach((el) => {
      el.addEventListener("click", closeReportModal);
    });

    els.btnReportPick?.addEventListener("click", startReportPick);

    els.btnReportGps?.addEventListener("click", () => {
      if (!navigator.geolocation) {
        showReportFormError("Geolocation not supported");
        return;
      }
      els.btnReportGps.disabled = true;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          els.reportLat.value = pos.coords.latitude.toFixed(6);
          els.reportLng.value = pos.coords.longitude.toFixed(6);
          try {
            const rev = await Geocoding.reverse(pos.coords.latitude, pos.coords.longitude);
            if (els.reportAddress) els.reportAddress.value = rev.display_name.split(",").slice(0, 3).join(",").trim();
            if (els.reportName && !els.reportName.value.trim()) {
              els.reportName.value = rev.display_name.split(",")[0].trim().slice(0, 80);
            }
          } catch {
            /* ignore */
          }
          if (els.reportCoordsHint) els.reportCoordsHint.textContent = "Location set from GPS.";
          els.btnReportGps.disabled = false;
          showToast("GPS location filled", "success");
        },
        (err) => {
          els.btnReportGps.disabled = false;
          showReportFormError(err.message || "Could not get GPS location");
        },
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });

    els.reportForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      clearReportFormError();

      const name = els.reportName?.value?.trim() || "";
      const lat = parseFloat(els.reportLat?.value);
      const lng = parseFloat(els.reportLng?.value);

      if (!name) {
        showReportFormError("Add a short location label");
        els.reportName?.focus();
        return;
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        showReportFormError("Enter valid latitude and longitude, or pick on the map");
        return;
      }

      try {
        const entry = Storage.addReport({
          name,
          lat,
          lng,
          type: els.reportType?.value || "Flock",
          confidence: els.reportConfidence?.value || "sighted",
          direction: els.reportDirection?.value || "",
          address: els.reportAddress?.value || "",
          notes: els.reportNotes?.value || "",
        });

        els.reportForm.reset();
        closeReportModal();
        refreshCommunityUI();
        refreshCamerasAfterReportChange();
        state.map?.setView([entry.lat, entry.lng], Math.max(state.map.getZoom(), 14));
        showToast("Camera report saved on this device", "success");
      } catch (err) {
        showReportFormError(err.message || "Could not save report");
      }
    });
  }

  // ---------- PWA UI ----------
  function setupPWA() {
    const settings = Storage.loadSettings();
    if (settings.bufferMeters) {
      state.bufferMeters = settings.bufferMeters;
      els.bufferSlider.value = String(settings.bufferMeters);
      els.bufferValue.textContent = `${settings.bufferMeters} m`;
    }
    if (typeof settings.showCommunity === "boolean") {
      state.showCommunity = settings.showCommunity;
      if (els.toggleCommunity) els.toggleCommunity.checked = settings.showCommunity;
    }
    // Live OSM defaults ON for real trips; mock OFF unless user enabled it
    if (typeof AppConfig !== "undefined" && AppConfig.cameras) {
      state.useLiveOsm = AppConfig.cameras.useLiveOsm !== false;
      state.useMockData = AppConfig.cameras.useMockData === true;
    }
    if (typeof settings.useLiveOsm === "boolean") {
      state.useLiveOsm = settings.useLiveOsm;
    }
    if (typeof settings.useMockData === "boolean") {
      state.useMockData = settings.useMockData;
    }
    if (els.toggleLiveOsm) els.toggleLiveOsm.checked = state.useLiveOsm;
    if (els.toggleMockData) els.toggleMockData.checked = state.useMockData;
    updateOsmStatusText();

    PWA.init({
      onPromptAvailable(available) {
        els.btnInstall.classList.toggle("hidden", !available);
        els.btnInstall.classList.toggle("inline-flex", available);
        if (available && !settings.installDismissed) {
          els.installBanner.hidden = false;
        }
      },
      onInstalled() {
        els.btnInstall.classList.add("hidden");
        els.installBanner.hidden = true;
        showToast("Flock Dodger installed", "success");
      },
    });

    const doInstall = async () => {
      const result = await PWA.promptInstall();
      if (result.outcome === "unavailable") {
        showToast("Use your browser’s Install / Add to Home Screen menu", "error");
      }
      els.installBanner.hidden = true;
    };

    els.btnInstall.addEventListener("click", doInstall);
    els.btnInstallBanner.addEventListener("click", doInstall);
    els.btnDismissInstall.addEventListener("click", () => {
      els.installBanner.hidden = true;
      Storage.saveSettings({ installDismissed: true });
    });
  }

  // ---------- Boot ----------
  function boot() {
    // Drop bloated OSM camera caches from older builds (localStorage OOM risk)
    if (typeof OverpassCameras !== "undefined" && OverpassCameras.clearCache) {
      try {
        OverpassCameras.clearCache();
      } catch {
        /* ignore */
      }
    }

    initMap();
    bindEvents();
    setupPWA();
    updateMapEmpty();
    updateOnlineStatus();
    refreshCommunityUI();
    // GPS → local area + live cameras (no manual zoom needed)
    autoFocusCurrentArea();

    console.info(
      "%cFlock Dodger%c ready — privacy-first routing",
      "color:#3dd68c;font-weight:bold",
      "color:#9fb5a8"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
