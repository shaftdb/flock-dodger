/**
 * OpenStreetMap Nominatim geocoding helpers.
 * Respects Nominatim usage policy: identify app, debounce, limit requests.
 */

const Geocoding = (() => {
  const BASE = "https://nominatim.openstreetmap.org";
  const HEADERS = {
    Accept: "application/json",
    // Browser will set User-Agent; Nominatim also looks at referer.
  };

  let abortController = null;

  /**
   * Forward geocode a free-text query.
   * @param {string} query
   * @param {{limit?: number, signal?: AbortSignal}} [opts]
   * @returns {Promise<Array<{lat:number,lng:number,display_name:string,type:string,importance:number}>>}
   */
  async function search(query, opts = {}) {
    const q = (query || "").trim();
    if (q.length < 3) return [];

    const params = new URLSearchParams({
      q,
      format: "json",
      addressdetails: "0",
      limit: String(opts.limit ?? 5),
    });

    const res = await fetch(`${BASE}/search?${params}`, {
      headers: HEADERS,
      signal: opts.signal,
    });

    if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
    const data = await res.json();
    return (data || []).map((item) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      display_name: item.display_name,
      type: item.type || item.class || "place",
      importance: item.importance || 0,
    }));
  }

  /**
   * Reverse geocode lat/lng to a display name.
   */
  async function reverse(lat, lng, opts = {}) {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: "json",
    });
    const res = await fetch(`${BASE}/reverse?${params}`, {
      headers: HEADERS,
      signal: opts.signal,
    });
    if (!res.ok) throw new Error(`Reverse geocoding failed (${res.status})`);
    const data = await res.json();
    return {
      lat,
      lng,
      display_name: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      type: data.type || "location",
    };
  }

  /**
   * Debounced autocomplete helper.
   * @param {function} onResults (results, meta?) => void
   * @param {number} delayMs
   */
  function createAutocomplete(onResults, delayMs = 380) {
    let timer = null;
    let lastQuery = "";

    return {
      query(text) {
        lastQuery = text;
        if (timer) clearTimeout(timer);
        if (abortController) abortController.abort();

        const q = (text || "").trim();
        if (q.length < 3) {
          onResults([]);
          return;
        }

        timer = setTimeout(async () => {
          abortController = new AbortController();
          try {
            const results = await search(q, { signal: abortController.signal, limit: 5 });
            if (lastQuery.trim() === q) onResults(results);
          } catch (err) {
            if (err.name === "AbortError") return;
            console.warn("Autocomplete error", err);
            if (lastQuery.trim() === q) {
              onResults([], { error: true });
            }
          }
        }, delayMs);
      },
      cancel() {
        if (timer) clearTimeout(timer);
        if (abortController) abortController.abort();
      },
    };
  }

  return { search, reverse, createAutocomplete };
})();
