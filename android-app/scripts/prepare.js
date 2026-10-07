// Copies the shared web app (../www) into ./www for Capacitor. App files are copied unchanged.
// sw.js is left out in the native shell (the app registers it inside try/catch, so a 404 is harmless).
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', '..', 'www'), dst = path.join(__dirname, '..', 'www');
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
fs.rmSync(path.join(dst, 'sw.js'), { force: true });
console.log('web assets copied to', dst);
