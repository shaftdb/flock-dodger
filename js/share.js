/**
 * Shareable route links via URL hash (no account).
 * Format: #r=lat,lng|lat,lng&b=150
 */

const ShareRoute = (() => {
  function encode(start, end, bufferMeters) {
    if (!start || !end) return "";
    const s = `${start.lat.toFixed(6)},${start.lng.toFixed(6)}`;
    const e = `${end.lat.toFixed(6)},${end.lng.toFixed(6)}`;
    const b = bufferMeters ?? 150;
    const names = [];
    if (start.display_name) names.push(`sn=${encodeURIComponent(start.display_name.slice(0, 80))}`);
    if (end.display_name) names.push(`en=${encodeURIComponent(end.display_name.slice(0, 80))}`);
    const extra = names.length ? `&${names.join("&")}` : "";
    return `#r=${s}|${e}&b=${b}${extra}`;
  }

  function buildUrl(start, end, bufferMeters) {
    const hash = encode(start, end, bufferMeters);
    if (!hash) return "";
    return `${location.origin}${location.pathname}${hash}`;
  }

  function parse(hash) {
    const h = (hash || location.hash || "").replace(/^#/, "");
    if (!h) return null;
    const params = new URLSearchParams(h.replace(/\|/g, "&_pipe_="));
    // Custom parse: r=lat,lng|lat,lng
    const rMatch = h.match(/(?:^|&)r=([^&]+)/);
    if (!rMatch) return null;
    const parts = decodeURIComponent(rMatch[1]).split("|");
    if (parts.length !== 2) return null;
    const [sLat, sLng] = parts[0].split(",").map(Number);
    const [eLat, eLng] = parts[1].split(",").map(Number);
    if (![sLat, sLng, eLat, eLng].every(Number.isFinite)) return null;
    const bMatch = h.match(/(?:^|&)b=(\d+)/);
    const sn = h.match(/(?:^|&)sn=([^&]+)/);
    const en = h.match(/(?:^|&)en=([^&]+)/);
    return {
      start: {
        lat: sLat,
        lng: sLng,
        display_name: sn ? decodeURIComponent(sn[1]) : `${sLat.toFixed(5)}, ${sLng.toFixed(5)}`,
        type: "share",
      },
      end: {
        lat: eLat,
        lng: eLng,
        display_name: en ? decodeURIComponent(en[1]) : `${eLat.toFixed(5)}, ${eLng.toFixed(5)}`,
        type: "share",
      },
      bufferMeters: bMatch ? Number(bMatch[1]) : 150,
    };
  }

  async function copyLink(start, end, bufferMeters) {
    const url = buildUrl(start, end, bufferMeters);
    if (!url) throw new Error("Plan a route first");
    await navigator.clipboard.writeText(url);
    return url;
  }

  return { encode, buildUrl, parse, copyLink };
})();
