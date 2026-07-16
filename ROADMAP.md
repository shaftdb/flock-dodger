# Flock Dodger — ideas for testers this week

## Already improved
- Live OSM cameras (ALPR + optional broader surveillance)
- Android Capacitor shell for Play Store path
- Privacy-first free core

## High-value next features

1. **Trip mode** — keep screen on, show next cameras ahead along route, simple “camera in X miles” banner  
2. **Saved areas** — pin “home / work corridors” and pre-load OSM packs for those bboxes  
3. **Shareable route link** — copy URL with start/end (no account); open on phone  
4. **Report quality** — thumbs up/down on OSM cameras (“gone”, “still there”) stored locally first  
5. **Layer filters** — toggle ALPR / CCTV / speed separately on the map  
6. **Better avoidance** — multiple OSRM alternatives scored; show “why this detour”  
7. **Night / low-data mode** — fewer tiles, fewer markers, offline shell first  
8. **Import GPX** — drop a planned trip file and score cameras along it  
9. **Widget / shortcut** — Android shortcut: “Route home avoiding cameras”  
10. **Privacy policy page** — required for Play Store location access  

## Data ideas
- OSM `man_made=surveillance` (done as mode)  
- Speed cameras (`highway=speed_camera`)  
- Later: optional user-contributed “hotspots” export (JSON file, not a server)  
- Never depend on proprietary Flock APIs  

## Testing checklist for friends
- [ ] Plan real commute / work trip  
- [ ] Compare standard vs avoid time  
- [ ] Export to Google/Waze and verify usability  
- [ ] Toggle “All surveillance” vs ALPR-only  
- [ ] Report a missing camera  
- [ ] Try on Android build when available  
