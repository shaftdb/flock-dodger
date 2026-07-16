# Run Flock Dodger on your phone

This app is **static files only** (HTML/CSS/JS). You can host it for free and open the URL in any phone browser.

## Fastest options

| Method | Effort | Best for |
|--------|--------|----------|
| **GitHub Pages** (recommended) | ~10 min once | Free HTTPS URL you keep |
| **Netlify Drop** | 2 min | No git account needed |
| **Cloudflare Tunnel / local network** | 5 min | Only you, same Wi‑Fi |

---

## Option A — GitHub Pages (permanent phone bookmark)

### 1. Install Git (Windows)

If `git` is not found in a terminal:

```powershell
winget install --id Git.Git -e --source winget
```

Close and reopen the terminal after install.

### 2. Create a GitHub account

https://github.com/signup

### 3. Create a new empty repository

1. https://github.com/new  
2. Name it e.g. `flock-dodger`  
3. Leave it **public** (required for free Pages without a paid plan)  
4. **Do not** add a README if you already have this project folder  
5. Create repository

### 4. Push this project

In PowerShell (adjust the remote URL to **your** username/repo):

```powershell
cd E:\Flock-Prototype

git init
git add .
git commit -m "Initial Flock Dodger app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/flock-dodger.git
git push -u origin main
```

You’ll be asked to sign in to GitHub (browser or personal access token).

### 5. Turn on GitHub Pages

1. Repo → **Settings** → **Pages**  
2. **Source**: GitHub Actions  
3. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to finish (green check)

### 6. Open on your phone

Your site will be:

```text
https://YOUR_USERNAME.github.io/flock-dodger/
```

If the app is in a **subdirectory**, deep links and the service worker still use relative paths (`./`), which should work.

Bookmark it or use **Install** / Add to Home Screen for app-like use.

---

## Option B — Netlify Drop (no git)

1. Open https://app.netlify.com/drop  
2. Drag the entire `Flock-Prototype` folder onto the page  
3. Copy the `https://….netlify.app` link to your phone  

Good for a quick test. Free tier is enough for this app.

---

## Option C — Same Wi‑Fi only (no public internet)

On your PC (already works with a static server):

```powershell
cd E:\Flock-Prototype
python -m http.server 8080
```

Find your PC’s LAN IP (e.g. `ipconfig` → IPv4 like `192.168.1.42`).

On your phone (same Wi‑Fi):

```text
http://192.168.1.42:8080
```

Windows Firewall may prompt you to allow Python/network access.

**Note:** Some phone browsers block geolocation on plain `http://` non-localhost URLs. HTTPS hosts (Pages/Netlify) work better for GPS.

---

## After you change the code

```powershell
cd E:\Flock-Prototype
git add .
git commit -m "Describe your change"
git push
```

GitHub Actions redeploys Pages automatically.

---

## Privacy note

- Routes and community reports stay in **each device’s** `localStorage`.  
- Phones and PCs do **not** share that data unless you build sync later.  
- Don’t put Stripe **secret** keys in the repo (`js/config.js` is client-side only).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 404 on Pages | Confirm Pages source is **GitHub Actions** and the workflow succeeded |
| Blank page | Check browser console; hard-refresh. Confirm `index.html` is at repo root |
| Install / PWA missing | Needs HTTPS (Pages/Netlify) |
| Git not found | Reinstall Git, restart terminal, or use full path `"C:\Program Files\Git\bin\git.exe"` |
