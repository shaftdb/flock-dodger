/**
 * Export planned routes to Google Maps, Apple Maps, and Waze.
 * External apps re-route themselves; we pass origin/destination plus
 * sampled intermediate points from our geometry to approximate detours.
 */

const ExportMaps = (() => {
  /** Evenly sample intermediate waypoints from a [lat,lng][] polyline */
  function sampleWaypoints(coords, maxPoints = 8) {
    if (!coords || coords.length < 3) return [];
    const inner = coords.slice(1, -1);
    if (!inner.length) return [];
    if (inner.length <= maxPoints) {
      return inner.map(([lat, lng]) => ({ lat, lng }));
    }
    const out = [];
    for (let i = 0; i < maxPoints; i++) {
      const t = (i + 1) / (maxPoints + 1);
      const idx = Math.min(inner.length - 1, Math.round(t * (inner.length - 1)));
      const [lat, lng] = inner[idx];
      out.push({ lat, lng });
    }
    // Dedupe consecutive near-identical samples
    return out.filter((p, i, arr) => {
      if (i === 0) return true;
      const prev = arr[i - 1];
      return Math.abs(p.lat - prev.lat) > 1e-5 || Math.abs(p.lng - prev.lng) > 1e-5;
    });
  }

  function fmt(lat, lng) {
    return `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
  }

  /**
   * @param {{ start: {lat,lng}, end: {lat,lng}, coords?: number[][], preferWaypoints?: boolean }} opts
   */
  function buildLinks({ start, end, coords, preferWaypoints = true }) {
    if (!start || !end) return null;
    const origin = fmt(start.lat, start.lng);
    const dest = fmt(end.lat, end.lng);
    const wps = preferWaypoints ? sampleWaypoints(coords || [], 8) : [];

    // Google Maps Directions API URL
    // https://developers.google.com/maps/documentation/urls/get-started#directions-action
    let google =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(dest)}` +
      `&travelmode=driving`;
    if (wps.length) {
      google += `&waypoints=${encodeURIComponent(wps.map((p) => fmt(p.lat, p.lng)).join("|"))}`;
    }

    // Apple Maps — intermediate stops via +to:
    // https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html
    let apple = `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&dirflg=d`;
    if (wps.length) {
      const chain = [...wps.map((p) => fmt(p.lat, p.lng)), dest].join("+to:");
      apple += `&daddr=${encodeURIComponent(chain)}`;
    } else {
      apple += `&daddr=${encodeURIComponent(dest)}`;
    }

    // Waze — navigate to destination (uses current location as start on device).
    // Optional "from" is not reliably supported; we still pass favorite destination.
    // https://developers.google.com/waze/deeplinks
    const waze =
      `https://waze.com/ul?ll=${encodeURIComponent(dest)}` +
      `&navigate=yes` +
      `&zoom=17`;

    // Waze alternate with search-style coords (some clients)
    const wazeFromStart =
      `https://waze.com/ul?ll=${Number(end.lat).toFixed(6)},${Number(end.lng).toFixed(6)}` +
      `&navigate=yes`;

    return {
      google,
      apple,
      waze: wazeFromStart || waze,
      waypointsUsed: wps.length,
    };
  }

  /**
   * Open a maps URL. Uses a temporary <a> so mobile browsers handle app schemes better.
   */
  function open(url) {
    if (!url) return false;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }

  /**
   * @param {"google"|"apple"|"waze"} provider
   * @param {{ start, end, coords?, preferWaypoints? }} route
   */
  function exportTo(provider, route) {
    const links = buildLinks(route);
    if (!links) throw new Error("Set start and end before exporting");
    const url = links[provider];
    if (!url) throw new Error(`Unknown maps provider: ${provider}`);
    open(url);
    return links;
  }

  return { sampleWaypoints, buildLinks, open, exportTo };
})();
