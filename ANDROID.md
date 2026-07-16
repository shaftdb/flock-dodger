# Android app (Google Play path)

Flock Dodger is packaged with **Capacitor**: the same web app runs inside a native Android shell. **No full rewrite.**

## Prerequisites

1. [Node.js LTS](https://nodejs.org/)
2. [Android Studio](https://developer.android.com/studio) (SDK 34+, build-tools, emulator or phone)
3. Java 17 (comes with Android Studio)

## Build & run

```powershell
cd E:\Flock-Prototype
npm install
npm run build          # copies site → www/
npx cap add android    # first time only
npm run cap:sync       # after any web change
npm run cap:open       # opens Android Studio
```

In Android Studio: run on a device/emulator, or **Build → Generate Signed App Bundle** for Play Console.

## After web tweaks this week

```powershell
npm run cap:sync
```

Then rebuild/run in Android Studio.

## Play Console (when ready)

1. Create app: **Flock Dodger**, package `com.flockdodger.app`
2. Upload AAB (signed)
3. Privacy policy URL (location + local storage)
4. Data safety: location (approximate/precise), no account, data on device
5. Screenshots, feature graphic, content rating

## Package ID

Defined in `capacitor.config.json` → `appId`. Change **before** first Play upload if you want a different ID.
