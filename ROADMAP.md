# Flock Dodger — roadmap

## Shipped (high-value set)

1. **Trip mode** — wake lock, next camera ahead, progress along route  
2. **Saved areas** — Home / Work pins + quick jump (Android shortcut `?area=home`)  
3. **Shareable route link** — `#r=lat,lng|lat,lng&b=150` copy button  
4. **Report quality** — Still there / Gone on OSM cameras (local)  
5. **Layer filters** — ALPR, CCTV, speed, reports separately  
6. **Why this detour** — reasons panel after plan  
7. **Low-data / night mode** — fewer markers + dimmer tiles  
8. **Import GPX** — score track against cameras, then plan ends  
9. **Android shortcuts** — Plan route + Route home  
10. **Privacy policy** — `privacy.html` for Play Store  

## Later ideas
- Trip “camera in X miles” voice cue  
- Cloud-free export of local reports/votes as JSON  
- Self-hosted Overpass for heavy testers  
- iOS via Capacitor when ready  

## Testing checklist
- [ ] Plan real trip; read “Why this detour”  
- [ ] Share link → open on phone  
- [ ] Save Home/Work; use shortcut  
- [ ] Toggle ALPR / CCTV / speed  
- [ ] Vote camera gone/still there  
- [ ] Import a GPX  
- [ ] Trip mode while driving a short loop  
- [ ] Low-data mode on mobile data  
