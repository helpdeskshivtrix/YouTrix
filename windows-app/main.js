const { app, BrowserWindow, Menu, shell, protocol, net, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

/*
 * The app files are packaged inside the .exe, but they are served under the app's real web address
 * (https://helpdeskshivtrix.github.io/HomePage/ztube/). YouTube players only accept a real https origin,
 * so this keeps the app working exactly like the website, while app code stays unchanged.
 */
const HOST = 'helpdeskshivtrix.github.io';
const BASE = '/HomePage/ztube/';
const START = 'https://' + HOST + BASE + 'index.html';
const WEB = path.join(__dirname, 'app-www');
let win = null;

// room followers must be able to start playback without an extra click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 380, minHeight: 560,
    backgroundColor: '#030407',
    title: 'YouTrix',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  win.loadURL(START);
  const external = url => { if (/^https?:/.test(url)) shell.openExternal(url); };
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('https://' + HOST + BASE)) { e.preventDefault(); external(url); }
  });
  win.on('closed', () => { win = null; });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    // camera (QR scan), clipboard and fullscreen are allowed for the app
    const ok = p => ['media', 'mediaKeySystem', 'clipboard-sanitized-write', 'clipboard-read', 'fullscreen', 'fileSystem'].includes(p);
    session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(ok(perm)));
    session.defaultSession.setPermissionCheckHandler((_wc, perm) => ok(perm));

    protocol.handle('https', async req => {
      const u = new URL(req.url);
      if (u.hostname === HOST && u.pathname.startsWith(BASE)) {
        let rel = decodeURIComponent(u.pathname.slice(BASE.length)) || 'index.html';
        const f = path.normalize(path.join(WEB, rel));
        if (!f.startsWith(WEB)) return new Response('Forbidden', { status: 403 });
        if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return new Response('Not found', { status: 404 });
        return net.fetch(pathToFileURL(f).toString());
      }
      // everything else (YouTube, relays, lyrics...) goes to the network unchanged
      const init = { method: req.method, headers: req.headers, redirect: 'follow', bypassCustomProtocolHandlers: true };
      if (req.method !== 'GET' && req.method !== 'HEAD') init.body = Buffer.from(await req.arrayBuffer());
      return net.fetch(req.url, init);
    });
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
