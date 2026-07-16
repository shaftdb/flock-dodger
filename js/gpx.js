/**
 * GPX parse / score helpers for Flock Dodger.
 */

const GpxUtil = (() => {
  function parseGpxText(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) {
      throw new Error("Invalid GPX file");
    }
    const pts = [];
    doc.querySelectorAll("trkpt, rtept").forEach((el) => {
      const lat = parseFloat(el.getAttribute("lat"));
      const lng = parseFloat(el.getAttribute("lon"));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        pts.push([lat, lng]);
      }
    });
    // Also bare wpt as single-point route ends
    if (pts.length < 2) {
      doc.querySelectorAll("wpt").forEach((el) => {
        const lat = parseFloat(el.getAttribute("lat"));
        const lng = parseFloat(el.getAttribute("lon"));
        if (Number.isFinite(lat) && Number.isFinite(lng)) pts.push([lat, lng]);
      });
    }
    if (pts.length < 2) throw new Error("GPX needs at least 2 track/route points");
    return {
      coords: pts,
      start: { lat: pts[0][0], lng: pts[0][1], display_name: "GPX start", type: "gpx" },
      end: {
        lat: pts[pts.length - 1][0],
        lng: pts[pts.length - 1][1],
        display_name: "GPX end",
        type: "gpx",
      },
    };
  }

  function lengthMeters(coords) {
    let d = 0;
    for (let i = 1; i < coords.length; i++) {
      d += CameraData.haversineMeters(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    }
    return d;
  }

  return { parseGpxText, lengthMeters };
})();
