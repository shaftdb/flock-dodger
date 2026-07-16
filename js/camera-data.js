/**
 * Flock Dodger — US ALPR / Flock-style camera points
 *
 * Dense mock coverage for Ohio & West Virginia (community-reported corridor
 * patterns + realistic intersection placement). Broader US metros for demos.
 *
 * NOT a verified real-world inventory. Approximate positions for routing demos.
 * Inspired by public reporting patterns (retail lots, bridges, arterials, PD contracts).
 */

const CAMERA_DATASET = (() => {
  const F = "Flock";
  const A = "ALPR";
  const M = "Municipal ALPR";
  const S = "mock-corridor"; // synthetic but place-named
  const C = "community-pattern"; // matches public reports of presence, not exact GPS
  const P = "placeholder";

  /** @type {Array<{lat:number,lng:number,name:string,type:string,source:string,region?:string}>} */
  const cameras = [
    // ═══════════════════════════════════════════════════════════
    // WEST VIRGINIA — dense
    // ═══════════════════════════════════════════════════════════

    // Parkersburg / Wood County (heavily reported Flock presence)
    { lat: 39.2667, lng: -81.5615, name: "Parkersburg — 7th St @ Market", type: F, source: C, region: "WV" },
    { lat: 39.2645, lng: -81.5580, name: "Parkersburg — Juliana St corridor", type: F, source: C, region: "WV" },
    { lat: 39.2590, lng: -81.5620, name: "Parkersburg — Murdoch Ave @ 19th", type: A, source: S, region: "WV" },
    { lat: 39.2520, lng: -81.5555, name: "Parkersburg — Division St S", type: F, source: C, region: "WV" },
    { lat: 39.2485, lng: -81.5480, name: "S Parkersburg — retail corridor (Walmart area)", type: F, source: C, region: "WV" },
    { lat: 39.2455, lng: -81.5425, name: "S Parkersburg — Lowe's area ALPR", type: F, source: C, region: "WV" },
    { lat: 39.2705, lng: -81.5485, name: "Parkersburg — Emerson Ave", type: A, source: S, region: "WV" },
    { lat: 39.2780, lng: -81.5350, name: "Parkersburg — Grand Central Ave", type: F, source: S, region: "WV" },
    { lat: 39.2835, lng: -81.5610, name: "Parkersburg — Pike St N", type: A, source: S, region: "WV" },
    { lat: 39.2660, lng: -81.5755, name: "Parkersburg — Ohio River bridge approach (WV)", type: F, source: C, region: "WV" },
    { lat: 39.2555, lng: -81.5200, name: "Parkersburg — I-77 Exit 176 area", type: F, source: S, region: "WV" },
    { lat: 39.2405, lng: -81.5105, name: "Parkersburg — I-77 @ WV-14", type: A, source: S, region: "WV" },
    { lat: 39.2950, lng: -81.5255, name: "Vienna — Grand Central @ 34th", type: F, source: S, region: "WV" },
    { lat: 39.3020, lng: -81.5380, name: "Vienna — 16th St corridor", type: A, source: S, region: "WV" },
    { lat: 39.3205, lng: -81.5570, name: "Williamstown — WV-14 / I-77 area", type: F, source: S, region: "WV" },
    { lat: 39.2330, lng: -81.5450, name: "Mineral Wells — US-21 corridor", type: A, source: S, region: "WV" },

    // Charleston / Kanawha
    { lat: 38.3498, lng: -81.6326, name: "Charleston — Capitol St @ Washington", type: F, source: S, region: "WV" },
    { lat: 38.3555, lng: -81.6390, name: "Charleston — Virginia St E", type: A, source: S, region: "WV" },
    { lat: 38.3480, lng: -81.6205, name: "Charleston — Kanawha Blvd E", type: F, source: S, region: "WV" },
    { lat: 38.3655, lng: -81.6455, name: "Charleston — Washington St W @ Patrick", type: A, source: S, region: "WV" },
    { lat: 38.3405, lng: -81.6550, name: "S Charleston — MacCorkle Ave", type: F, source: S, region: "WV" },
    { lat: 38.3720, lng: -81.6655, name: "Charleston — Corridor G / US-119", type: F, source: S, region: "WV" },
    { lat: 38.3805, lng: -81.7105, name: "Cross Lanes — Nitro Market Pl area", type: A, source: S, region: "WV" },
    { lat: 38.4205, lng: -81.8205, name: "Nitro — 1st Ave corridor", type: F, source: S, region: "WV" },
    { lat: 38.3355, lng: -81.7155, name: "S Charleston — Jefferson Rd", type: A, source: S, region: "WV" },
    { lat: 38.3600, lng: -81.5800, name: "Charleston — I-64/I-77 split area", type: F, source: S, region: "WV" },
    { lat: 38.3905, lng: -81.5955, name: "Charleston — Greenbrier St @ 35th", type: A, source: S, region: "WV" },
    { lat: 38.4055, lng: -81.5605, name: "Marmet — MacCorkle Ave SE", type: F, source: S, region: "WV" },

    // Huntington / Cabell / Wayne
    { lat: 38.4192, lng: -82.4452, name: "Huntington — 3rd Ave @ 8th St", type: F, source: S, region: "WV" },
    { lat: 38.4155, lng: -82.4305, name: "Huntington — 5th Ave corridor", type: A, source: S, region: "WV" },
    { lat: 38.4100, lng: -82.4550, name: "Huntington — Hal Greer @ 3rd", type: F, source: S, region: "WV" },
    { lat: 38.4255, lng: -82.4055, name: "Huntington — 16th St @ 3rd Ave", type: A, source: S, region: "WV" },
    { lat: 38.4005, lng: -82.4705, name: "Huntington — US-60 W / 5th St Rd", type: F, source: S, region: "WV" },
    { lat: 38.3905, lng: -82.5205, name: "Barboursville — Mall Rd / I-64", type: F, source: S, region: "WV" },
    { lat: 38.3805, lng: -82.5455, name: "Barboursville — US-60 @ Mall Rd", type: A, source: S, region: "WV" },
    { lat: 38.4055, lng: -82.3505, name: "Huntington — I-64 Exit 11 area", type: F, source: S, region: "WV" },
    { lat: 38.3655, lng: -82.5805, name: "Milton — US-60 corridor", type: A, source: S, region: "WV" },

    // Morgantown / Monongalia
    { lat: 39.6295, lng: -79.9559, name: "Morgantown — High St @ Walnut", type: F, source: S, region: "WV" },
    { lat: 39.6355, lng: -79.9550, name: "Morgantown — University Ave", type: A, source: S, region: "WV" },
    { lat: 39.6455, lng: -79.9705, name: "Morgantown — Patteson Dr @ WV-705", type: F, source: S, region: "WV" },
    { lat: 39.6205, lng: -79.9405, name: "Morgantown — Don Knotts Blvd", type: A, source: S, region: "WV" },
    { lat: 39.6555, lng: -79.9555, name: "Morgantown — Mileground Rd", type: F, source: S, region: "WV" },
    { lat: 39.6105, lng: -79.9805, name: "Morgantown — I-79 Exit 155 area", type: F, source: S, region: "WV" },
    { lat: 39.5805, lng: -80.0405, name: "Westover — US-19 corridor", type: A, source: S, region: "WV" },
    { lat: 39.6705, lng: -79.9105, name: "Cheat Lake — WV-857 area", type: F, source: S, region: "WV" },

    // Wheeling / Ohio County / Northern Panhandle
    { lat: 40.0640, lng: -80.7209, name: "Wheeling — Main St @ 10th", type: F, source: S, region: "WV" },
    { lat: 40.0705, lng: -80.7205, name: "Wheeling — National Rd E", type: A, source: S, region: "WV" },
    { lat: 40.0555, lng: -80.7055, name: "Wheeling — I-70 downtown exits", type: F, source: S, region: "WV" },
    { lat: 40.0855, lng: -80.6905, name: "Wheeling — Cabela Dr / Highlands", type: F, source: S, region: "WV" },
    { lat: 40.0405, lng: -80.7355, name: "Wheeling — WV-2 S corridor", type: A, source: S, region: "WV" },
    { lat: 40.1205, lng: -80.6905, name: "Triadelphia — Three Springs Dr", type: F, source: S, region: "WV" },
    { lat: 40.1505, lng: -80.6505, name: "Valley Grove — I-70 area", type: A, source: S, region: "WV" },

    // Martinsburg / Eastern Panhandle
    { lat: 39.4562, lng: -77.9639, name: "Martinsburg — Queen St @ King", type: F, source: S, region: "WV" },
    { lat: 39.4605, lng: -77.9505, name: "Martinsburg — Winchester Ave", type: A, source: S, region: "WV" },
    { lat: 39.4455, lng: -77.9805, name: "Martinsburg — Foxcroft Ave retail", type: F, source: S, region: "WV" },
    { lat: 39.4305, lng: -77.9605, name: "Martinsburg — I-81 Exit 12 area", type: F, source: S, region: "WV" },
    { lat: 39.4805, lng: -77.9405, name: "Martinsburg — WV-9 corridor", type: A, source: S, region: "WV" },
    { lat: 39.3505, lng: -77.8605, name: "Charles Town — Washington St", type: F, source: S, region: "WV" },
    { lat: 39.2905, lng: -77.8605, name: "Ranson — George St area", type: A, source: S, region: "WV" },
    { lat: 39.2905, lng: -78.1205, name: "Inwood — I-81 Exit 5 area", type: F, source: S, region: "WV" },

    // Clarksburg / Bridgeport / Fairmont
    { lat: 39.2806, lng: -80.3445, name: "Clarksburg — Main St @ 3rd", type: F, source: S, region: "WV" },
    { lat: 39.2905, lng: -80.3305, name: "Clarksburg — Emily Dr / Eastpointe", type: A, source: S, region: "WV" },
    { lat: 39.2855, lng: -80.2505, name: "Bridgeport — Lodgeville Rd / I-79", type: F, source: S, region: "WV" },
    { lat: 39.2755, lng: -80.2405, name: "Bridgeport — Emily Dr retail", type: F, source: S, region: "WV" },
    { lat: 39.4851, lng: -80.1426, name: "Fairmont — Adams St @ Merchant", type: A, source: S, region: "WV" },
    { lat: 39.4755, lng: -80.1555, name: "Fairmont — Locust Ave corridor", type: F, source: S, region: "WV" },
    { lat: 39.4605, lng: -80.1305, name: "Fairmont — I-79 Exit 137 area", type: F, source: S, region: "WV" },

    // Beckley / Princeton / Bluefield
    { lat: 37.7782, lng: -81.1882, name: "Beckley — Neville St @ Main", type: F, source: S, region: "WV" },
    { lat: 37.7905, lng: -81.1755, name: "Beckley — Harper Rd / I-64", type: A, source: S, region: "WV" },
    { lat: 37.7705, lng: -81.1605, name: "Beckley — Eisenhower Dr retail", type: F, source: S, region: "WV" },
    { lat: 37.7605, lng: -81.2005, name: "Beckley — WV-16 S corridor", type: A, source: S, region: "WV" },
    { lat: 37.3668, lng: -81.1026, name: "Princeton — Courthouse Rd area", type: F, source: S, region: "WV" },
    { lat: 37.2700, lng: -81.2223, name: "Bluefield — Cumberland Rd", type: A, source: S, region: "WV" },

    // Lewisburg / Elkins / other
    { lat: 37.8018, lng: -80.4456, name: "Lewisburg — N Jefferson St", type: F, source: S, region: "WV" },
    { lat: 38.9257, lng: -79.8467, name: "Elkins — Randolph Ave", type: A, source: S, region: "WV" },
    { lat: 39.4859, lng: -80.1423, name: "Fairmont — Middletown Rd", type: F, source: S, region: "WV" },
    { lat: 38.8762, lng: -82.1285, name: "Point Pleasant — Main St / WV-2", type: A, source: S, region: "WV" },
    { lat: 39.0915, lng: -81.7637, name: "Ravenswood — Washington St / US-33", type: F, source: S, region: "WV" },
    { lat: 38.8170, lng: -82.1400, name: "Pt Pleasant — Silver Bridge area (WV)", type: F, source: S, region: "WV" },

    // ═══════════════════════════════════════════════════════════
    // OHIO — dense (esp. SE OH / river towns + major metros)
    // ═══════════════════════════════════════════════════════════

    // Belpre / Marietta / SE Ohio river corridor (public reports)
    { lat: 39.2737, lng: -81.5729, name: "Belpre — Main St bridge approach", type: F, source: C, region: "OH" },
    { lat: 39.2715, lng: -81.5805, name: "Belpre — Farson St corridor", type: F, source: C, region: "OH" },
    { lat: 39.2680, lng: -81.5855, name: "Belpre — Washington Blvd area", type: A, source: S, region: "OH" },
    { lat: 39.2785, lng: -81.5650, name: "Belpre — Ohio River bridge (OH side)", type: F, source: C, region: "OH" },
    { lat: 39.4154, lng: -81.4548, name: "Marietta — 2nd St @ Putnam", type: F, source: S, region: "OH" },
    { lat: 39.4205, lng: -81.4505, name: "Marietta — Pike St corridor", type: A, source: S, region: "OH" },
    { lat: 39.4055, lng: -81.4405, name: "Marietta — I-77 bridge to WV", type: F, source: C, region: "OH" },
    { lat: 39.4305, lng: -81.4605, name: "Marietta — Acme St / retail", type: A, source: S, region: "OH" },
    { lat: 39.3905, lng: -81.4205, name: "Marietta — SR-7 S corridor", type: F, source: S, region: "OH" },
    { lat: 39.3505, lng: -81.5205, name: "Little Hocking — SR-7 area", type: A, source: S, region: "OH" },
    { lat: 39.4655, lng: -81.3805, name: "Devola — SR-60 corridor", type: F, source: S, region: "OH" },

    // Athens County (reported Flock contracts)
    { lat: 39.3292, lng: -82.1013, name: "Athens — Court St @ Union", type: F, source: S, region: "OH" },
    { lat: 39.3355, lng: -82.1055, name: "Athens — E State St / Stimson", type: A, source: S, region: "OH" },
    { lat: 39.3205, lng: -82.0955, name: "Athens — Richland Ave corridor", type: F, source: S, region: "OH" },
    { lat: 39.3405, lng: -82.1205, name: "Athens — W Union St", type: A, source: S, region: "OH" },
    { lat: 39.3105, lng: -82.0805, name: "Athens — US-33 / SR-682 area", type: F, source: S, region: "OH" },
    { lat: 39.3555, lng: -82.1505, name: "The Plains — SR-682 corridor", type: A, source: S, region: "OH" },
    { lat: 39.3805, lng: -82.2205, name: "Nelsonville — Canal St / US-33", type: F, source: S, region: "OH" },
    { lat: 39.2805, lng: -82.0505, name: "Athens Co — US-50 E corridor", type: A, source: S, region: "OH" },
    { lat: 39.2505, lng: -82.1805, name: "Albany — SR-32 / US-50 area", type: F, source: S, region: "OH" },
    { lat: 39.4005, lng: -81.9805, name: "Coolville — SR-7 / US-50", type: A, source: S, region: "OH" },

    // Columbus metro
    { lat: 39.9612, lng: -82.9988, name: "Columbus — High St @ Broad", type: F, source: S, region: "OH" },
    { lat: 39.9685, lng: -82.9980, name: "Columbus — N High @ Nationwide", type: A, source: S, region: "OH" },
    { lat: 39.9555, lng: -83.0005, name: "Columbus — Front St @ Town", type: F, source: S, region: "OH" },
    { lat: 39.9805, lng: -83.0055, name: "Columbus — Olentangy River Rd", type: A, source: S, region: "OH" },
    { lat: 39.9405, lng: -82.9905, name: "Columbus — S High @ Greenlawn", type: F, source: S, region: "OH" },
    { lat: 40.0205, lng: -83.0205, name: "Columbus — Bethel Rd @ Sawmill", type: F, source: S, region: "OH" },
    { lat: 40.0505, lng: -82.9505, name: "Columbus — Morse Rd @ Cleveland", type: A, source: S, region: "OH" },
    { lat: 39.9205, lng: -82.9305, name: "Columbus — Livingston @ James", type: F, source: S, region: "OH" },
    { lat: 40.0005, lng: -82.8705, name: "Gahanna — Hamilton Rd corridor", type: A, source: S, region: "OH" },
    { lat: 39.9505, lng: -83.0805, name: "Upper Arlington — Lane Ave", type: F, source: S, region: "OH" },
    { lat: 40.0805, lng: -83.0805, name: "Dublin — Sawmill @ Hard Rd", type: F, source: S, region: "OH" },
    { lat: 40.1005, lng: -82.9205, name: "Westerville — State St @ Schrock", type: F, source: C, region: "OH" },
    { lat: 40.1105, lng: -82.9305, name: "Westerville — Cleveland Ave N", type: F, source: C, region: "OH" },
    { lat: 40.0955, lng: -82.9105, name: "Westerville — Polaris / Gemini area", type: A, source: S, region: "OH" },
    { lat: 40.0905, lng: -82.9505, name: "Westerville — SR-3 / Africa Rd", type: F, source: S, region: "OH" },
    { lat: 40.1205, lng: -82.8805, name: "New Albany — US-62 corridor", type: A, source: S, region: "OH" },
    { lat: 40.1505, lng: -82.9505, name: "Sunbury — Cherry St / US-36", type: F, source: C, region: "OH" },
    { lat: 40.1805, lng: -82.9805, name: "Delaware — Sandusky St corridor", type: F, source: C, region: "OH" },
    { lat: 40.2005, lng: -83.0005, name: "Delaware — US-23 / SR-37 area", type: A, source: S, region: "OH" },
    { lat: 40.1605, lng: -82.8505, name: "Delaware Co — I-71 Exit 131 area", type: F, source: S, region: "OH" },
    { lat: 39.8805, lng: -82.9505, name: "Grove City — Stringtown Rd", type: A, source: S, region: "OH" },
    { lat: 39.8605, lng: -83.0805, name: "Grove City — I-71 @ SR-665", type: F, source: S, region: "OH" },
    { lat: 39.9005, lng: -82.8205, name: "Reynoldsburg — Main St / US-40", type: A, source: S, region: "OH" },
    { lat: 40.0405, lng: -83.1505, name: "Hilliard — Cemetery Rd corridor", type: F, source: S, region: "OH" },
    { lat: 39.9805, lng: -82.8505, name: "Whitehall — E Broad St", type: A, source: S, region: "OH" },
    { lat: 40.0605, lng: -82.8005, name: "New Albany Rd / SR-161 area", type: F, source: S, region: "OH" },

    // Cleveland / NE Ohio
    { lat: 41.4993, lng: -81.6944, name: "Cleveland — Euclid Ave @ E 9th", type: F, source: C, region: "OH" },
    { lat: 41.5055, lng: -81.6905, name: "Cleveland — Superior @ E 12th", type: A, source: S, region: "OH" },
    { lat: 41.4905, lng: -81.6805, name: "Cleveland — Carnegie @ E 22nd", type: F, source: S, region: "OH" },
    { lat: 41.4805, lng: -81.7105, name: "Cleveland — W 25th @ Lorain", type: A, source: S, region: "OH" },
    { lat: 41.5205, lng: -81.6505, name: "Cleveland — St Clair @ E 55th", type: F, source: S, region: "OH" },
    { lat: 41.4505, lng: -81.7005, name: "Cleveland — Broadway @ Harvard", type: A, source: S, region: "OH" },
    { lat: 41.4705, lng: -81.6205, name: "Cleveland — Kinsman @ E 93rd", type: F, source: S, region: "OH" },
    { lat: 41.4305, lng: -81.7505, name: "Cleveland — Pearl Rd corridor", type: A, source: S, region: "OH" },
    { lat: 41.4805, lng: -81.8005, name: "Lakewood — Detroit Ave", type: F, source: S, region: "OH" },
    { lat: 41.4505, lng: -81.5505, name: "Shaker Hts — Chagrin Blvd", type: A, source: S, region: "OH" },
    { lat: 41.4005, lng: -81.6505, name: "Parma — Ridge Rd @ Snow", type: F, source: S, region: "OH" },
    { lat: 41.3805, lng: -81.7505, name: "Parma — W 130th corridor", type: A, source: S, region: "OH" },
    { lat: 41.5205, lng: -81.4505, name: "Euclid — Lakeshore Blvd", type: F, source: S, region: "OH" },
    { lat: 41.5005, lng: -81.4005, name: "Willoughby — Euclid Ave / SR-2", type: A, source: S, region: "OH" },
    { lat: 41.3505, lng: -81.8505, name: "Strongsville — Royalton Rd", type: F, source: S, region: "OH" },
    { lat: 41.3105, lng: -81.6005, name: "Independence — Rockside Rd / I-77", type: F, source: S, region: "OH" },
    { lat: 41.2805, lng: -81.5505, name: "Brecksville — Miller Rd / I-77", type: A, source: S, region: "OH" },
    { lat: 41.1505, lng: -81.7005, name: "Akron — Main St @ Market", type: F, source: S, region: "OH" },
    { lat: 41.0805, lng: -81.5205, name: "Akron — E Market / SR-18", type: A, source: S, region: "OH" },
    { lat: 41.1005, lng: -81.5805, name: "Akron — W Market @ Hawkins", type: F, source: S, region: "OH" },
    { lat: 41.0505, lng: -81.6505, name: "Akron — I-77 @ Arlington Rd", type: A, source: S, region: "OH" },
    { lat: 41.1605, lng: -81.4005, name: "Kent — SR-59 / Haymaker", type: F, source: S, region: "OH" },
    { lat: 41.0205, lng: -81.4505, name: "Canton — Tuscarawas St W", type: A, source: S, region: "OH" },
    { lat: 40.8005, lng: -81.3705, name: "Canton — Whipple Ave corridor", type: F, source: S, region: "OH" },
    { lat: 41.0805, lng: -80.6505, name: "Youngstown — Federal St", type: A, source: S, region: "OH" },
    { lat: 41.1005, lng: -80.6805, name: "Youngstown — Market St / Mahoning", type: F, source: S, region: "OH" },
    { lat: 41.1505, lng: -80.7505, name: "Boardman — Market St / SR-224", type: F, source: S, region: "OH" },

    // Cincinnati / SW Ohio
    { lat: 39.1031, lng: -84.5120, name: "Cincinnati — 5th St @ Vine", type: F, source: S, region: "OH" },
    { lat: 39.1105, lng: -84.5155, name: "Cincinnati — Freedom Way / Banks", type: A, source: S, region: "OH" },
    { lat: 39.1205, lng: -84.5205, name: "Cincinnati — Central Pkwy", type: F, source: S, region: "OH" },
    { lat: 39.1405, lng: -84.4805, name: "Cincinnati — Madison Rd @ Edwards", type: A, source: S, region: "OH" },
    { lat: 39.0905, lng: -84.4805, name: "Cincinnati — Columbia Pkwy", type: F, source: S, region: "OH" },
    { lat: 39.1605, lng: -84.5405, name: "Cincinnati — Clifton Ave corridor", type: A, source: S, region: "OH" },
    { lat: 39.2005, lng: -84.4505, name: "Cincinnati — Montgomery Rd", type: F, source: S, region: "OH" },
    { lat: 39.2305, lng: -84.3805, name: "Kenwood — Montgomery / I-71", type: F, source: S, region: "OH" },
    { lat: 39.1805, lng: -84.6005, name: "Cincinnati — Colerain Ave", type: A, source: S, region: "OH" },
    { lat: 39.2505, lng: -84.5205, name: "Springdale — Princeton Pike", type: F, source: S, region: "OH" },
    { lat: 39.2805, lng: -84.3505, name: "Mason — Fields Ertel / I-71", type: A, source: S, region: "OH" },
    { lat: 39.3305, lng: -84.4005, name: "West Chester — Tylersville Rd", type: F, source: C, region: "OH" },
    { lat: 39.3505, lng: -84.3805, name: "West Chester — Union Centre Blvd", type: F, source: C, region: "OH" },
    { lat: 39.4005, lng: -84.5605, name: "Hamilton — High St / Main", type: F, source: C, region: "OH" },
    { lat: 39.4105, lng: -84.5505, name: "Hamilton — Erie Blvd corridor", type: A, source: S, region: "OH" },
    { lat: 39.4205, lng: -84.5805, name: "Hamilton — Main St N", type: F, source: C, region: "OH" },
    { lat: 39.5105, lng: -84.7405, name: "Oxford — High St / SR-73", type: F, source: C, region: "OH" },
    { lat: 39.5055, lng: -84.7455, name: "Oxford — S Campus Ave", type: A, source: S, region: "OH" },
    { lat: 39.4505, lng: -84.3505, name: "Middletown — Breiel Blvd", type: F, source: S, region: "OH" },
    { lat: 39.0805, lng: -84.3005, name: "Amelia — SR-125 corridor", type: A, source: S, region: "OH" },
    { lat: 39.0505, lng: -84.2005, name: "Batavia — SR-32 / SR-222", type: F, source: S, region: "OH" },

    // Dayton / Springfield / Lima / NW
    { lat: 39.7589, lng: -84.1916, name: "Dayton — 3rd St @ Main", type: F, source: S, region: "OH" },
    { lat: 39.7655, lng: -84.1855, name: "Dayton — N Main @ Monument", type: A, source: S, region: "OH" },
    { lat: 39.7505, lng: -84.2005, name: "Dayton — Salem Ave corridor", type: F, source: S, region: "OH" },
    { lat: 39.7205, lng: -84.1805, name: "Dayton — Wayne Ave S", type: A, source: S, region: "OH" },
    { lat: 39.7805, lng: -84.1505, name: "Dayton — Brandt Pike / I-70", type: F, source: S, region: "OH" },
    { lat: 39.7005, lng: -84.1205, name: "Kettering — Dorothy Ln", type: A, source: S, region: "OH" },
    { lat: 39.6805, lng: -84.1605, name: "Centerville — SR-48 / Spring Valley", type: F, source: S, region: "OH" },
    { lat: 39.8205, lng: -84.1005, name: "Huber Heights — Brandt Pike N", type: A, source: S, region: "OH" },
    { lat: 39.9205, lng: -83.8005, name: "Springfield — Main St / Limestone", type: F, source: S, region: "OH" },
    { lat: 39.9305, lng: -83.8205, name: "Springfield — Bechtle Ave", type: A, source: S, region: "OH" },
    { lat: 40.7405, lng: -84.1055, name: "Lima — Main St / Market", type: F, source: C, region: "OH" },
    { lat: 40.7505, lng: -84.1005, name: "Lima — Cable Rd corridor", type: F, source: C, region: "OH" },
    { lat: 40.7305, lng: -84.1205, name: "Lima — Allentown Rd / I-75", type: A, source: S, region: "OH" },
    { lat: 40.7605, lng: -84.0805, name: "Lima — Elida Rd area", type: F, source: S, region: "OH" },
    { lat: 41.6505, lng: -83.5505, name: "Toledo — Summit St @ Madison", type: F, source: S, region: "OH" },
    { lat: 41.6605, lng: -83.5405, name: "Toledo — Monroe St corridor", type: A, source: S, region: "OH" },
    { lat: 41.6305, lng: -83.5805, name: "Toledo — Secor Rd / Central", type: F, source: S, region: "OH" },
    { lat: 41.6805, lng: -83.4805, name: "Toledo — Navarre Ave / I-280", type: A, source: S, region: "OH" },
    { lat: 41.5805, lng: -83.6505, name: "Maumee — Anthony Wayne Trl", type: F, source: S, region: "OH" },
    { lat: 41.5505, lng: -83.5805, name: "Perrysburg — SR-25 / I-75", type: A, source: S, region: "OH" },
    { lat: 40.0505, lng: -84.2005, name: "Troy — Market St / I-75", type: F, source: S, region: "OH" },
    { lat: 40.1005, lng: -84.2505, name: "Piqua — Main St / US-36", type: A, source: S, region: "OH" },
    { lat: 39.8505, lng: -84.3505, name: "Englewood — National Rd / I-70", type: F, source: S, region: "OH" },
    { lat: 39.8905, lng: -84.0205, name: "Enon — SR-4 / US-40 area", type: F, source: C, region: "OH" },

    // Zanesville / Lancaster / Chillicothe / Portsmouth (SE-central)
    { lat: 39.9403, lng: -82.0132, name: "Zanesville — Main St @ 5th", type: F, source: S, region: "OH" },
    { lat: 39.9505, lng: -82.0005, name: "Zanesville — Maple Ave corridor", type: A, source: S, region: "OH" },
    { lat: 39.9305, lng: -82.0305, name: "Zanesville — I-70 Exit 155 area", type: F, source: S, region: "OH" },
    { lat: 39.7137, lng: -82.5993, name: "Lancaster — Main St / Broad", type: A, source: S, region: "OH" },
    { lat: 39.7205, lng: -82.5905, name: "Lancaster — Memorial Dr", type: F, source: S, region: "OH" },
    { lat: 39.3331, lng: -82.9824, name: "Chillicothe — Main St / Paint", type: A, source: S, region: "OH" },
    { lat: 39.3405, lng: -82.9705, name: "Chillicothe — Bridge St / US-23", type: F, source: S, region: "OH" },
    { lat: 38.7317, lng: -82.9977, name: "Portsmouth — Chillicothe St", type: A, source: S, region: "OH" },
    { lat: 38.7405, lng: -82.9905, name: "Portsmouth — US-23 / Gay St", type: F, source: S, region: "OH" },
    { lat: 39.6055, lng: -82.9505, name: "Circleville — Main St / US-23", type: A, source: S, region: "OH" },
    { lat: 40.0805, lng: -82.4005, name: "Newark — Main St / 3rd", type: F, source: S, region: "OH" },
    { lat: 40.0605, lng: -82.4205, name: "Newark — 21st St / SR-16", type: A, source: S, region: "OH" },
    { lat: 39.9605, lng: -81.9805, name: "Zanesville — SR-60 S corridor", type: F, source: S, region: "OH" },
    { lat: 39.5505, lng: -81.9505, name: "McConnelsville — Main / SR-60", type: A, source: S, region: "OH" },
    { lat: 39.7205, lng: -81.8505, name: "Cambridge — Wheeling Ave / I-70", type: F, source: S, region: "OH" },
    { lat: 40.0505, lng: -81.5005, name: "Cambridge — I-77 / I-70 interchange area", type: A, source: S, region: "OH" },
    { lat: 39.3505, lng: -81.8505, name: "Beverly — SR-60 / SR-339", type: F, source: S, region: "OH" },
    { lat: 39.0005, lng: -82.0005, name: "Gallipolis — 2nd Ave / SR-7", type: A, source: S, region: "OH" },
    { lat: 38.8205, lng: -82.1405, name: "Gallipolis ferry approach area", type: F, source: S, region: "OH" },
    { lat: 38.9505, lng: -82.3005, name: "Jackson — Main St / US-35", type: A, source: S, region: "OH" },
    { lat: 39.2005, lng: -82.6005, name: "Logan — Main St / US-33", type: F, source: S, region: "OH" },

    // Steubenville / East Liverpool / OH River N
    { lat: 40.3698, lng: -80.6340, name: "Steubenville — 4th St @ Market", type: F, source: S, region: "OH" },
    { lat: 40.3755, lng: -80.6305, name: "Steubenville — John Scott Hwy", type: A, source: S, region: "OH" },
    { lat: 40.6205, lng: -80.5805, name: "East Liverpool — Broadway / SR-11", type: F, source: S, region: "OH" },
    { lat: 40.5505, lng: -80.6505, name: "Wellsville — Main St / SR-7", type: A, source: S, region: "OH" },

    // ═══════════════════════════════════════════════════════════
    // US METROS — improved mock density
    // ═══════════════════════════════════════════════════════════

    // Pittsburgh (near OH/WV)
    { lat: 40.4406, lng: -79.9959, name: "Pittsburgh — Liberty @ 6th", type: F, source: S, region: "PA" },
    { lat: 40.4505, lng: -79.9905, name: "Pittsburgh — Penn Ave Strip", type: A, source: S, region: "PA" },
    { lat: 40.4305, lng: -80.0105, name: "Pittsburgh — Carson St S Side", type: F, source: S, region: "PA" },
    { lat: 40.4605, lng: -79.9505, name: "Pittsburgh — Baum Blvd / E Liberty", type: A, source: S, region: "PA" },
    { lat: 40.4205, lng: -79.9205, name: "Pittsburgh — Forbes @ Murray", type: F, source: S, region: "PA" },
    { lat: 40.4805, lng: -80.0805, name: "Pittsburgh — McKnight Rd N", type: A, source: S, region: "PA" },
    { lat: 40.3505, lng: -80.0505, name: "Mt Lebanon — Washington Rd", type: F, source: S, region: "PA" },
    { lat: 40.5005, lng: -79.8505, name: "Monroeville — Business Rt 22", type: A, source: S, region: "PA" },

    // Louisville / Lexington / KY border
    { lat: 38.2527, lng: -85.7585, name: "Louisville — 4th St Live area", type: F, source: S, region: "KY" },
    { lat: 38.2405, lng: -85.7605, name: "Louisville — Broadway @ 2nd", type: A, source: S, region: "KY" },
    { lat: 38.2205, lng: -85.7005, name: "Louisville — Bardstown Rd", type: F, source: S, region: "KY" },
    { lat: 38.0406, lng: -84.5037, name: "Lexington — Main @ Limestone", type: A, source: S, region: "KY" },
    { lat: 38.0505, lng: -84.4905, name: "Lexington — New Circle / Nicholasville", type: F, source: S, region: "KY" },
    { lat: 38.4805, lng: -82.6405, name: "Ashland KY — Winchester Ave", type: A, source: S, region: "KY" },

    // Austin (keep rich demo set)
    { lat: 30.2672, lng: -97.7431, name: "Austin — Congress Ave @ 6th", type: F, source: P, region: "TX" },
    { lat: 30.2711, lng: -97.7415, name: "Austin — Lavaca St corridor", type: A, source: P, region: "TX" },
    { lat: 30.2640, lng: -97.7465, name: "Austin — S Lamar @ Barton Springs", type: F, source: P, region: "TX" },
    { lat: 30.2505, lng: -97.7502, name: "Austin — S Congress @ Oltorf", type: A, source: P, region: "TX" },
    { lat: 30.2845, lng: -97.7365, name: "Austin — Guadalupe @ 29th", type: F, source: P, region: "TX" },
    { lat: 30.2980, lng: -97.7388, name: "Austin — N Lamar @ 45th", type: A, source: P, region: "TX" },
    { lat: 30.3072, lng: -97.7201, name: "Austin — Airport Blvd corridor", type: F, source: P, region: "TX" },
    { lat: 30.2355, lng: -97.7260, name: "Austin — E Riverside @ I-35", type: A, source: P, region: "TX" },
    { lat: 30.2290, lng: -97.7555, name: "Austin — S 1st @ Stassney", type: F, source: P, region: "TX" },
    { lat: 30.3510, lng: -97.7520, name: "Austin — N MoPac @ Braker", type: A, source: P, region: "TX" },
    { lat: 30.3880, lng: -97.7195, name: "Austin — Parmer Ln @ I-35", type: F, source: P, region: "TX" },
    { lat: 30.2165, lng: -97.7965, name: "Austin — Slaughter @ MoPac", type: A, source: P, region: "TX" },
    { lat: 30.2758, lng: -97.7990, name: "Austin — Lake Austin Blvd", type: F, source: P, region: "TX" },
    { lat: 30.2420, lng: -97.7720, name: "Austin — Manchaca @ Ben White", type: A, source: P, region: "TX" },
    { lat: 30.3265, lng: -97.7055, name: "Austin — Cameron Rd @ US-290", type: F, source: P, region: "TX" },
    { lat: 30.2608, lng: -97.7140, name: "Austin — E 7th @ Pleasant Valley", type: A, source: P, region: "TX" },
    { lat: 30.2925, lng: -97.7705, name: "Austin — Burnet Rd @ Koenig", type: F, source: P, region: "TX" },
    { lat: 30.1855, lng: -97.7920, name: "Austin — IH-35 @ Slaughter", type: A, source: P, region: "TX" },
    { lat: 30.4015, lng: -97.8505, name: "Austin — RR 620 @ 183", type: F, source: P, region: "TX" },
    { lat: 30.3340, lng: -97.8200, name: "Austin — Spicewood Springs Rd", type: A, source: P, region: "TX" },

    // Dallas / Houston / SA
    { lat: 32.7767, lng: -96.7970, name: "Dallas — Main @ Akard", type: F, source: S, region: "TX" },
    { lat: 32.7905, lng: -96.8005, name: "Dallas — McKinney Ave", type: A, source: S, region: "TX" },
    { lat: 32.7505, lng: -96.8205, name: "Dallas — I-35E @ Colorado", type: F, source: S, region: "TX" },
    { lat: 32.8505, lng: -96.7705, name: "Dallas — Central Expwy @ Mockingbird", type: A, source: S, region: "TX" },
    { lat: 32.9205, lng: -96.7505, name: "Richardson — Central @ Belt Line", type: F, source: S, region: "TX" },
    { lat: 29.7604, lng: -95.3698, name: "Houston — Main @ Texas", type: A, source: S, region: "TX" },
    { lat: 29.7505, lng: -95.3805, name: "Houston — Westheimer @ Montrose", type: F, source: S, region: "TX" },
    { lat: 29.7805, lng: -95.4205, name: "Houston — I-10 @ Shepherd", type: A, source: S, region: "TX" },
    { lat: 29.7205, lng: -95.4505, name: "Houston — 610 Loop @ Bellaire", type: F, source: S, region: "TX" },
    { lat: 29.5405, lng: -98.4805, name: "San Antonio — Broadway @ Hildebrand", type: A, source: S, region: "TX" },
    { lat: 29.4205, lng: -98.4905, name: "San Antonio — Commerce @ Alamo", type: F, source: S, region: "TX" },

    // Denver
    { lat: 39.7392, lng: -104.9903, name: "Denver — 16th St Mall @ Broadway", type: F, source: P, region: "CO" },
    { lat: 39.7455, lng: -104.9870, name: "Denver — Colfax @ Lincoln", type: A, source: P, region: "CO" },
    { lat: 39.7285, lng: -104.9855, name: "Denver — Broadway @ Speer", type: F, source: P, region: "CO" },
    { lat: 39.7540, lng: -105.0005, name: "Denver — Federal @ I-70", type: A, source: P, region: "CO" },
    { lat: 39.7105, lng: -104.9875, name: "Denver — S Broadway @ Alameda", type: F, source: P, region: "CO" },
    { lat: 39.7685, lng: -104.9730, name: "Denver — Colorado Blvd @ I-70", type: A, source: P, region: "CO" },
    { lat: 39.6765, lng: -104.9870, name: "Denver — University @ Yale", type: F, source: P, region: "CO" },
    { lat: 39.7405, lng: -105.0255, name: "Denver — Sheridan @ Colfax", type: A, source: P, region: "CO" },

    // Phoenix
    { lat: 33.4484, lng: -112.0740, name: "Phoenix — Central @ Van Buren", type: F, source: P, region: "AZ" },
    { lat: 33.4655, lng: -112.0740, name: "Phoenix — Central @ McDowell", type: A, source: P, region: "AZ" },
    { lat: 33.4345, lng: -112.0740, name: "Phoenix — Central @ Buckeye", type: F, source: P, region: "AZ" },
    { lat: 33.5095, lng: -112.0740, name: "Phoenix — Central @ Camelback", type: A, source: P, region: "AZ" },
    { lat: 33.4484, lng: -111.9260, name: "Scottsdale Rd @ Thomas", type: F, source: P, region: "AZ" },
    { lat: 33.3920, lng: -111.9260, name: "Loop 101 @ McClintock", type: A, source: P, region: "AZ" },
    { lat: 33.5095, lng: -112.1505, name: "Phoenix — I-17 @ Camelback", type: F, source: P, region: "AZ" },
    { lat: 33.3775, lng: -112.0740, name: "Phoenix — Baseline @ Central", type: A, source: P, region: "AZ" },

    // Seattle
    { lat: 47.6062, lng: -122.3321, name: "Seattle — Pike @ 4th Ave", type: F, source: P, region: "WA" },
    { lat: 47.6205, lng: -122.3493, name: "Seattle — Aurora @ Denny", type: A, source: P, region: "WA" },
    { lat: 47.5985, lng: -122.3255, name: "Seattle — I-5 @ Yesler", type: F, source: P, region: "WA" },
    { lat: 47.6615, lng: -122.3130, name: "Seattle — University Way @ 45th", type: A, source: P, region: "WA" },
    { lat: 47.5755, lng: -122.3865, name: "Seattle — Fauntleroy @ SW Alaska", type: F, source: P, region: "WA" },
    { lat: 47.6685, lng: -122.3835, name: "Seattle — 15th Ave NW @ Market", type: A, source: P, region: "WA" },

    // Atlanta
    { lat: 33.7490, lng: -84.3880, name: "Atlanta — Peachtree @ Andrew Young", type: F, source: P, region: "GA" },
    { lat: 33.7720, lng: -84.3900, name: "Atlanta — I-75/85 @ 14th St", type: A, source: P, region: "GA" },
    { lat: 33.7555, lng: -84.3905, name: "Atlanta — North Ave @ Spring", type: F, source: P, region: "GA" },
    { lat: 33.7205, lng: -84.3960, name: "Atlanta — Metropolitan Pkwy", type: A, source: P, region: "GA" },
    { lat: 33.7860, lng: -84.3835, name: "Atlanta — Piedmont @ Monroe", type: F, source: P, region: "GA" },
    { lat: 33.8465, lng: -84.3620, name: "Atlanta — GA-400 @ Lenox", type: A, source: P, region: "GA" },

    // Portland
    { lat: 45.5152, lng: -122.6784, name: "Portland — SW Broadway @ Yamhill", type: F, source: P, region: "OR" },
    { lat: 45.5305, lng: -122.6655, name: "Portland — I-5 @ Broadway Bridge", type: A, source: P, region: "OR" },
    { lat: 45.5045, lng: -122.6780, name: "Portland — Naito @ Hawthorne", type: F, source: P, region: "OR" },
    { lat: 45.5485, lng: -122.6755, name: "Portland — Interstate Ave @ Lombard", type: A, source: P, region: "OR" },

    // Chicago
    { lat: 41.8781, lng: -87.6298, name: "Chicago — State @ Madison", type: F, source: S, region: "IL" },
    { lat: 41.8905, lng: -87.6305, name: "Chicago — Michigan @ Chicago Ave", type: A, source: S, region: "IL" },
    { lat: 41.8605, lng: -87.6405, name: "Chicago — Roosevelt @ Halsted", type: F, source: S, region: "IL" },
    { lat: 41.9205, lng: -87.6505, name: "Chicago — Fullerton @ Sheffield", type: A, source: S, region: "IL" },
    { lat: 41.8505, lng: -87.7205, name: "Chicago — I-55 @ Damen", type: F, source: S, region: "IL" },
    { lat: 41.9505, lng: -87.7505, name: "Chicago — Irving Park @ Cicero", type: A, source: S, region: "IL" },

    // NYC / Philly / DC / Baltimore / Boston
    { lat: 40.7128, lng: -74.0060, name: "NYC — Broadway @ Chambers", type: F, source: S, region: "NY" },
    { lat: 40.7505, lng: -73.9905, name: "NYC — 7th Ave @ 34th", type: A, source: S, region: "NY" },
    { lat: 40.7605, lng: -73.9805, name: "NYC — Lexington @ 53rd", type: F, source: S, region: "NY" },
    { lat: 40.6805, lng: -73.9805, name: "Brooklyn — Flatbush @ Atlantic", type: A, source: S, region: "NY" },
    { lat: 39.9526, lng: -75.1652, name: "Philadelphia — Market @ 15th", type: F, source: S, region: "PA" },
    { lat: 39.9605, lng: -75.1505, name: "Philadelphia — Broad @ Spring Garden", type: A, source: S, region: "PA" },
    { lat: 39.9405, lng: -75.1805, name: "Philadelphia — South St @ 5th", type: F, source: S, region: "PA" },
    { lat: 38.9072, lng: -77.0369, name: "Washington DC — 14th @ K St", type: A, source: S, region: "DC" },
    { lat: 38.8955, lng: -77.0305, name: "Washington DC — Constitution @ 7th", type: F, source: S, region: "DC" },
    { lat: 38.9205, lng: -77.0405, name: "Washington DC — Connecticut @ R", type: A, source: S, region: "DC" },
    { lat: 39.2904, lng: -76.6122, name: "Baltimore — Light St @ Pratt", type: F, source: S, region: "MD" },
    { lat: 39.3005, lng: -76.6205, name: "Baltimore — N Charles @ Eager", type: A, source: S, region: "MD" },
    { lat: 42.3601, lng: -71.0589, name: "Boston — Washington @ School", type: F, source: S, region: "MA" },
    { lat: 42.3505, lng: -71.0705, name: "Boston — Boylston @ Dartmouth", type: A, source: S, region: "MA" },

    // LA / SF / SD
    { lat: 34.0522, lng: -118.2437, name: "Los Angeles — Spring @ 1st", type: F, source: S, region: "CA" },
    { lat: 34.0605, lng: -118.2505, name: "Los Angeles — Figueroa @ 7th", type: A, source: S, region: "CA" },
    { lat: 34.0905, lng: -118.3205, name: "Los Angeles — Hollywood @ Vine", type: F, source: S, region: "CA" },
    { lat: 34.0205, lng: -118.4005, name: "Los Angeles — Venice @ Sepulveda", type: A, source: S, region: "CA" },
    { lat: 37.7749, lng: -122.4194, name: "San Francisco — Market @ 5th", type: F, source: S, region: "CA" },
    { lat: 37.7855, lng: -122.4055, name: "San Francisco — Mission @ 3rd", type: A, source: S, region: "CA" },
    { lat: 37.7605, lng: -122.4305, name: "San Francisco — 19th Ave @ Irving", type: F, source: S, region: "CA" },
    { lat: 32.7157, lng: -117.1611, name: "San Diego — Broadway @ 5th", type: A, source: S, region: "CA" },
    { lat: 32.7505, lng: -117.1605, name: "San Diego — University @ Park", type: F, source: S, region: "CA" },

    // Miami / Tampa / Orlando / Charlotte / Nashville / Indy / Detroit / Minneapolis
    { lat: 25.7617, lng: -80.1918, name: "Miami — Biscayne @ NE 1st", type: F, source: S, region: "FL" },
    { lat: 25.7805, lng: -80.1905, name: "Miami — I-95 @ NW 8th", type: A, source: S, region: "FL" },
    { lat: 27.9506, lng: -82.4572, name: "Tampa — Kennedy @ Ashley", type: F, source: S, region: "FL" },
    { lat: 28.5383, lng: -81.3792, name: "Orlando — Orange Ave @ Church", type: A, source: S, region: "FL" },
    { lat: 35.2271, lng: -80.8431, name: "Charlotte — Trade @ Tryon", type: F, source: S, region: "NC" },
    { lat: 35.2105, lng: -80.8505, name: "Charlotte — South Blvd corridor", type: A, source: S, region: "NC" },
    { lat: 36.1627, lng: -86.7816, name: "Nashville — Broadway @ 2nd", type: F, source: S, region: "TN" },
    { lat: 36.1505, lng: -86.8005, name: "Nashville — West End @ 21st", type: A, source: S, region: "TN" },
    { lat: 39.7684, lng: -86.1581, name: "Indianapolis — Meridian @ Washington", type: F, source: S, region: "IN" },
    { lat: 39.7805, lng: -86.1505, name: "Indianapolis — Mass Ave corridor", type: A, source: S, region: "IN" },
    { lat: 42.3314, lng: -83.0458, name: "Detroit — Woodward @ Campus Martius", type: F, source: S, region: "MI" },
    { lat: 42.3505, lng: -83.0605, name: "Detroit — Grand River @ Trumbull", type: A, source: S, region: "MI" },
    { lat: 44.9778, lng: -93.2650, name: "Minneapolis — Nicollet @ 7th", type: F, source: S, region: "MN" },
    { lat: 44.9505, lng: -93.2805, name: "Minneapolis — Lyndale @ Lake", type: A, source: S, region: "MN" },

    // St. Louis / KC / Milwaukee / Richmond / Raleigh
    { lat: 38.6270, lng: -90.1994, name: "St. Louis — Market @ 8th", type: F, source: S, region: "MO" },
    { lat: 39.0997, lng: -94.5786, name: "Kansas City — Main @ 12th", type: A, source: S, region: "MO" },
    { lat: 43.0389, lng: -87.9065, name: "Milwaukee — Wisconsin @ Water", type: F, source: S, region: "WI" },
    { lat: 37.5407, lng: -77.4360, name: "Richmond — Broad @ 7th", type: A, source: S, region: "VA" },
    { lat: 35.7796, lng: -78.6382, name: "Raleigh — Fayetteville @ Hargett", type: F, source: S, region: "NC" },
  ];

  /**
   * Approximate highway corridor samples for I-70 / I-77 / I-79 / US-50
   * between major OH–WV nodes (deterministic midpoints).
   */
  const corridors = [
    // I-77 OH/WV spine (Cleveland → Akron → Canton → Marietta → Parkersburg → Charleston)
    { from: [41.31, -81.60], to: [41.08, -81.52], n: 3, name: "I-77 corridor", region: "OH" },
    { from: [41.08, -81.52], to: [40.80, -81.37], n: 2, name: "I-77 corridor", region: "OH" },
    { from: [40.80, -81.37], to: [39.72, -81.85], n: 4, name: "I-77 corridor", region: "OH" },
    { from: [39.72, -81.85], to: [39.41, -81.45], n: 3, name: "I-77 corridor", region: "OH" },
    { from: [39.41, -81.45], to: [39.27, -81.56], n: 2, name: "I-77 OH–WV", region: "WV" },
    { from: [39.27, -81.56], to: [38.95, -81.55], n: 3, name: "I-77 corridor", region: "WV" },
    { from: [38.95, -81.55], to: [38.35, -81.63], n: 4, name: "I-77 corridor", region: "WV" },

    // I-70 Wheeling → Columbus → Dayton → Indy direction (OH segment)
    { from: [40.06, -80.72], to: [40.00, -82.00], n: 5, name: "I-70 corridor", region: "OH" },
    { from: [40.00, -82.00], to: [39.96, -83.00], n: 4, name: "I-70 corridor", region: "OH" },
    { from: [39.96, -83.00], to: [39.76, -84.19], n: 4, name: "I-70 corridor", region: "OH" },

    // I-79 Morgantown → Fairmont → Clarksburg → Charleston direction
    { from: [39.63, -79.96], to: [39.48, -80.14], n: 2, name: "I-79 corridor", region: "WV" },
    { from: [39.48, -80.14], to: [39.28, -80.34], n: 2, name: "I-79 corridor", region: "WV" },
    { from: [39.28, -80.34], to: [38.80, -80.80], n: 3, name: "I-79 corridor", region: "WV" },
    { from: [38.80, -80.80], to: [38.35, -81.63], n: 4, name: "I-79 corridor", region: "WV" },

    // US-50 Athens → Coolville → Parkersburg area
    { from: [39.33, -82.10], to: [39.40, -81.98], n: 2, name: "US-50 corridor", region: "OH" },
    { from: [39.40, -81.98], to: [39.27, -81.56], n: 3, name: "US-50 corridor", region: "OH" },

    // SR-7 Ohio River (East Liverpool → Steubenville → Marietta → Gallipolis)
    { from: [40.62, -80.58], to: [40.37, -80.63], n: 2, name: "SR-7 river corridor", region: "OH" },
    { from: [40.37, -80.63], to: [39.42, -81.45], n: 5, name: "SR-7 river corridor", region: "OH" },
    { from: [39.42, -81.45], to: [39.00, -82.00], n: 3, name: "SR-7 river corridor", region: "OH" },

    // I-64 Huntington → Charleston
    { from: [38.42, -82.45], to: [38.39, -82.00], n: 3, name: "I-64 corridor", region: "WV" },
    { from: [38.39, -82.00], to: [38.35, -81.63], n: 3, name: "I-64 corridor", region: "WV" },

    // US-33 Athens → Columbus
    { from: [39.33, -82.10], to: [39.60, -82.60], n: 3, name: "US-33 corridor", region: "OH" },
    { from: [39.60, -82.60], to: [39.96, -83.00], n: 3, name: "US-33 corridor", region: "OH" },
  ];

  function expandCorridors() {
    const out = [];
    let i = 0;
    for (const c of corridors) {
      const [lat1, lng1] = c.from;
      const [lat2, lng2] = c.to;
      for (let s = 1; s <= c.n; s++) {
        const t = s / (c.n + 1);
        // slight lateral jitter for non-identical stacking
        const j = ((i * 17) % 7) - 3;
        out.push({
          lat: lat1 + (lat2 - lat1) * t + j * 0.002,
          lng: lng1 + (lng2 - lng1) * t + ((i * 13) % 5 - 2) * 0.002,
          name: `${c.name} monitor ${i + 1}`,
          type: s % 2 === 0 ? F : A,
          source: "corridor-mock",
          region: c.region,
        });
        i++;
      }
    }
    return out;
  }

  const ALL = cameras.concat(expandCorridors());

  /** Bounding boxes for density-boosted procedural fill (OH / WV). */
  const HOT_REGIONS = [
    // Ohio
    { minLat: 38.4, maxLat: 42.0, minLng: -84.9, maxLng: -80.5, density: 0.55, label: "OH" },
    // West Virginia
    { minLat: 37.2, maxLat: 40.7, minLng: -82.7, maxLng: -77.7, density: 0.5, label: "WV" },
    // Pittsburgh / SW PA border (spillover)
    { minLat: 40.2, maxLat: 40.7, minLng: -80.3, maxLng: -79.7, density: 0.4, label: "PA-SW" },
  ];

  return { ALL, HOT_REGIONS, count: ALL.length };
})();
