const { app, BrowserWindow, Menu, shell, protocol, net, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

/*
 * Normal start: the window loads the live site (https://helpdeskshivtrix.github.io/HomePage/ztube/) directly,
 * exactly like a browser, so YouTube's player gets a real page origin + Referer (this avoids YouTube error 153).
 * Offline start: if the site cannot be reached, the copy packaged inside the app is served under the same
 * address instead, so the app still opens.
 */
const HOST = 'helpdeskshivtrix.github.io';
const BASE = '/HomePage/ztube/';
const START = 'https://' + HOST + BASE + 'index.html';
const WEB = path.join(__dirname, 'app-www');
let win = null;
let localMode = false;

// room followers must be able to start playback without an extra click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function enableLocal() {
  if (localMode) return;
  localMode = true;
  protocol.handle('https', async req => {
    const u = new URL(req.url);
    if (u.hostname === HOST && u.pathname.startsWith(BASE)) {
      const rel = decodeURIComponent(u.pathname.slice(BASE.length)) || 'index.html';
      const f = path.normalize(path.join(WEB, rel));
      if (!f.startsWith(WEB)) return new Response('Forbidden', { status: 403 });
      if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(f).toString());
    }
    const headers = new Headers(req.headers);
    if (/(youtube|youtube-nocookie|ytimg|googlevideo|ggpht)\./.test(u.hostname) && !headers.get('referer')) {
      headers.set('Referer', 'https://' + HOST + '/');
    }
    const init = { method: req.method, headers, redirect: 'follow', bypassCustomProtocolHandlers: true };
    if (req.method !== 'GET' && req.method !== 'HEAD') init.body = Buffer.from(await req.arrayBuffer());
    return net.fetch(req.url, init);
  });
}

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
  const external = url => { if (/^https?:/.test(url)) shell.openExternal(url); };
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('https://' + HOST + BASE)) { e.preventDefault(); external(url); }
  });
  // site unreachable (offline etc.): switch to the packaged copy
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || localMode) return;
    if (url.startsWith('https://' + HOST + BASE)) { enableLocal(); win.loadURL(START); }
  });
  win.on('closed', () => { win = null; });
  win.loadURL(START);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    // camera (QR scan), clipboard and fullscreen are allowed for the app
    const ok = p => ['media', 'mediaKeySystem', 'clipboard-sanitized-write', 'clipboard-read', 'fullscreen'].includes(p);
    session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(ok(perm)));
    session.defaultSession.setPermissionCheckHandler((_wc, perm) => ok(perm));
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
