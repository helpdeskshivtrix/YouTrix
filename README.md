# YouTrix - PWA + Android APK + Windows app

Packaging for https://helpdeskshivtrix.github.io/HomePage/ztube/ . `www/` is your live `ztube` folder plus the changes listed under "What changed" below.

```
www/                 the PWA (ztube: index.html, sw.js, manifest.json, icons, libs/jsQR.js)
android-app/         Capacitor project -> APK
windows-app/         Electron project  -> installer + portable .exe
resources/           logo-based icon sources
.github/workflows/   build-android-apk.yml, winexe.yml
workflows-copy-paste/ same two YAML files, visible, for pasting on GitHub web
```

## Build on GitHub (web only)
1. Upload all folders and files of this project to a new repo named `YouTrix`.
2. Actions tab -> "Build Android APK" -> Run workflow. Download `app-debug.apk` from Artifacts (it comes inside a zip).
3. Actions tab -> "Build Windows App" -> Run workflow. Download the Setup and Portable `.exe` from Artifacts.

## Local build
- Android: `cd android-app && npm install && npm run apk:debug` (needs JDK 17 + Android SDK)
- Windows: `cd windows-app && npm install && npm run build:win`  (`npm start` to just run it)

## How the native apps run the web app
Android and Windows serve the packaged files under the app's real address
`https://helpdeskshivtrix.github.io/...`, so the YouTube player sees a normal https origin (a `localhost` or custom origin can make YouTube embeds refuse to play).
The app still needs internet for YouTube, metadata and lyrics, exactly like the website.
`sw.js` is not packaged into the APK/EXE (the app registers it inside try/catch).

## What changed in www/ (upload these to your gh-pages `ztube` folder too, including `libs/jsQR.js`)
- **Back button:** new responsive Back button in the player header (icon-only on phones, "Back" label on wider screens), at the top of every page except Home (search results, channels, playlists, Explore, Offline, Liked, History, Insights, your playlists), and at the top of every dialog (QR scan, room QR, Cast, Settings, Pro audio, palette). Back from the QR scanner returns to the room dialog.
- **Android / browser Back key:** closes dialog, then player, then goes to the previous page, before leaving the app. At the very top it shows "Press back again to exit".
- **Rooms:** invite link and QR now always point to `https://helpdeskshivtrix.github.io/HomePage/ztube/#room=ID` (inside the APK the app is served from the site root, which made shared links and camera-scanned QR codes dead); a 4th public relay was added; the QR decoder is bundled locally (`libs/jsQR.js`) with the CDN as fallback; `history` state is preserved when the room id is written to the address.
- **APK:** camera permission added (QR scan), and media can start without an extra tap so room followers play automatically.
- **Windows:** camera/clipboard permissions allowed, autoplay allowed, and non-app requests pass through to the network with their original method/body.
- `sw.js` cache name bumped to `v7` so installed PWAs pick up the update.

## Notes
- The APK is a debug build (installs directly). The Windows installer is unsigned, so SmartScreen shows "More info -> Run anyway".
- App ids: `app.shivtrix.youtrix` (change in `android-app/capacitor.config.json` and `windows-app/package.json`).
