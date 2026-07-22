const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const mm = require('music-metadata');
const RPC = require('discord-rpc');

let mainWindow;

// ---------- Discord Rich Presence ----------
const DISCORD_CLIENT_ID = '1529186611114283038';

let discordClient = null;
let discordReady = false;

function initDiscordRpc(attempt = 1) {
  if (!DISCORD_CLIENT_ID || DISCORD_CLIENT_ID === 'YOUR_DISCORD_CLIENT_ID_HERE') return;

  try {
    RPC.register(DISCORD_CLIENT_ID);
    discordClient = new RPC.Client({ transport: 'ipc' });

    discordClient.on('ready', () => {
      discordReady = true;
      console.log('Discord RPC connected.');
    });

    discordClient.on('disconnected', () => {
      discordReady = false;
      discordClient = null;
      scheduleDiscordRetry();
    });

    discordClient.login({ clientId: DISCORD_CLIENT_ID }).catch(() => {
      discordClient = null;
      discordReady = false;
      scheduleDiscordRetry(attempt);
    });
  } catch (err) {
    discordClient = null;
    discordReady = false;
    scheduleDiscordRetry(attempt);
  }
}

function scheduleDiscordRetry(attempt = 1) {
  if (attempt > 10) return; // stop after ~10 tries so it doesn't retry forever
  const delay = Math.min(attempt * 2000, 15000); // back off up to 15s between tries
  setTimeout(() => initDiscordRpc(attempt + 1), delay);
}

function setDiscordActivity(info) {
  if (!discordClient || !discordReady) return;
  try {
    const activity = {
      details: info.title || 'Listening to Frank Ocean',
      state: info.stateLine || 'by Frank Ocean',
      largeImageKey: info.albumKey || 'app_icon',
      largeImageText: info.album || 'Frank's Ocean',
      instance: false,
    };
    discordClient.setActivity(activity).catch(() => {});
  } catch (err) {
    // non-fatal
  }
}

function clearDiscordActivity() {
  if (!discordClient || !discordReady) return;
  try {
    discordClient.clearActivity().catch(() => {});
  } catch (err) {
    // non-fatal
  }
}

const CONFIG_PATH = () => path.join(app.getPath('userData'), 'config.json');
const LYRICS_CACHE_PATH = () => path.join(app.getPath('userData'), 'lyrics-cache.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf-8'));
  } catch (err) {
    return {};
  }
}

function writeConfig(config) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH()), { recursive: true });
    fs.writeFileSync(CONFIG_PATH(), JSON.stringify(config, null, 2));
  } catch (err) {
    // non-fatal
  }
}

function readLyricsCache() {
  try {
    return JSON.parse(fs.readFileSync(LYRICS_CACHE_PATH(), 'utf-8'));
  } catch (err) {
    return {};
  }
}

function writeLyricsCache(cache) {
  try {
    fs.mkdirSync(path.dirname(LYRICS_CACHE_PATH()), { recursive: true });
    fs.writeFileSync(LYRICS_CACHE_PATH(), JSON.stringify(cache, null, 2));
  } catch (err) {
    // non-fatal
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#0c0a09',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
	mainWindow.webContents.on('before-input-event', (event, input) => {
	if (input.control && input.shift && input.key.toLowerCase() === 'i') {
		mainWindow.webContents.toggleDevTools();
	}
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  initDiscordRpc();
});

app.on('window-all-closed', () => {
  clearDiscordActivity();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function findFlacFiles(dir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFlacFiles(full, results);
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.flac') {
      results.push(full);
    }
  }
  return results;
}

async function scanLibrary(folderPath) {
  const files = findFlacFiles(folderPath);
  const tracks = [];

  for (const filePath of files) {
    try {
      const metadata = await mm.parseFile(filePath, { duration: true, skipCovers: false });
      const common = metadata.common;
      let cover = null;
	  const picture = common.picture && common.picture[0];
	  if (picture) {
		const buf = Buffer.isBuffer(picture.data) ? picture.data : Buffer.from(picture.data);
		cover = `data:${picture.format};base64,${buf.toString('base64')}`;
	  }	
      tracks.push({
        path: filePath,
        url: pathToFileURL(filePath).href,
        title: common.title || path.basename(filePath, path.extname(filePath)),
        artist: common.artist || 'Unknown Artist',
        album: common.album || 'Unknown Album',
        track: common.track && common.track.no ? common.track.no : 0,
        year: common.year || null,
        duration: metadata.format.duration || 0,
        cover,
      });
    } catch (err) {
      tracks.push({
        path: filePath,
        url: pathToFileURL(filePath).href,
        title: path.basename(filePath, path.extname(filePath)),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        track: 0,
        year: null,
        duration: 0,
        cover: null,
      });
    }
  }

  tracks.sort((a, b) => {
    if (a.album !== b.album) return a.album.localeCompare(b.album);
    return (a.track || 0) - (b.track || 0);
  });

  return tracks;
}

// ---------- Config / library folder ----------

ipcMain.handle('get-config', () => readConfig());

ipcMain.handle('toggle-native-fullscreen', () => {
  const isFs = mainWindow.isFullScreen();
  mainWindow.setFullScreen(!isFs);
  return !isFs;
});

ipcMain.handle('is-native-fullscreen', () => mainWindow.isFullScreen());

ipcMain.handle('update-discord-presence', (event, info) => {
  setDiscordActivity(info);
});

ipcMain.handle('clear-discord-presence', () => {
  clearDiscordActivity();
});

ipcMain.handle('choose-library-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select the folder where your FLAC files live',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const folder = result.filePaths[0];
  const config = readConfig();
  config.libraryPath = folder;
  writeConfig(config);
  return folder;
});

ipcMain.handle('rescan-library', async () => {
  const config = readConfig();
  if (!config.libraryPath) return { tracks: [], libraryPath: null };
  const tracks = await scanLibrary(config.libraryPath);
  return { tracks, libraryPath: config.libraryPath };
});

// ---------- Lyrics (LRCLIB) ----------

ipcMain.handle('fetch-lyrics', async (event, { artist, title, album, duration }) => {
  const cache = readLyricsCache();
  const cacheKey = `${artist}::${title}::${album}`.toLowerCase();

  if (cache[cacheKey] !== undefined) {
    return cache[cacheKey];
  }

  try {
    const params = new URLSearchParams({
      artist_name: artist || '',
      track_name: title || '',
    });
    if (album) params.set('album_name', album);
    if (duration) params.set('duration', Math.round(duration).toString());

    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: { 'User-Agent': 'FO-Player (personal local music app)' },
    });

    if (!res.ok) {
      cache[cacheKey] = null;
      writeLyricsCache(cache);
      return null;
    }

    const data = await res.json();
    const result = {
      syncedLyrics: data.syncedLyrics || null,
      plainLyrics: data.plainLyrics || null,
    };
    cache[cacheKey] = result;
    writeLyricsCache(cache);
    return result;
  } catch (err) {
    return null;
  }
});