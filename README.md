# FO Player

A native Windows desktop app that turns a local folder of your own FLAC files into
a proper music library — scans recursively, reads embedded tags and cover art,
and plays everything with a console-style player bar (shuffle, repeat, seek, volume).

It doesn't ship with any music. Point it at a folder on your own drive that
already contains your FLAC files, and it builds the library from what's there.

## Requirements

- [Node.js](https://nodejs.org) 18 or newer (includes npm)
- Windows 10/11 (for the packaged app) — you can also run it in dev mode on
  macOS/Linux, since Electron itself is cross-platform

## Run it in development

```bash
cd fo-player
npm install
npm start
```

A window opens. The **first time only**, it'll ask you to pick your library
folder (subfolders are scanned too). After that it remembers the folder and
scans it automatically every time you launch the app — no picker, no button.

If you add or remove files later, click **Rescan library** in the sidebar.
**Change folder** lets you point it somewhere else entirely.

## Build a Windows installer (.exe)

Run this **on a Windows machine** (electron-builder's Windows target is most
reliable when built on Windows itself):

```bash
cd fo-player
npm install
npm run dist
```

This produces an NSIS installer under `dist/` — something like
`FO Player Setup 1.0.0.exe`. Run it to install the app normally, with a Start
Menu shortcut and uninstaller.

> If you'd rather build the Windows installer from macOS/Linux, electron-builder
> can cross-build using Wine, but it's finicky to set up. Building directly on
> Windows is the path of least resistance.

## Missing Tracks tab

The sidebar has a **Missing Tracks** view. It checks your library against Frank
Ocean's official discography (titles and track numbers only — no audio, no
lyrics) and lists anything it couldn't match to a file you already have,
along with the exact filename it's expecting (e.g. `09 - Nights.flac`).

This is a checklist, not a downloader — the app doesn't search the internet
for or fetch any audio itself. You source the file yourself, drop it in your
library folder using the suggested filename, and hit **Rescan library**.

## Lyrics

Click the **Aa** button in the player bar to open the lyrics panel. It looks
up synced lyrics for the currently playing track via the [LRCLIB](https://lrclib.net)
public API (a free, crowd-sourced lyrics database) and highlights the current
line in time with playback, karaoke-style. Results are cached locally so the
same track won't re-fetch on every play. If LRCLIB doesn't have a match, or
only has plain (unsynced) text, that's what you'll see instead.

## About Frank Ocean

A timeline tab covering confirmed career milestones from the mid-2000s
through 2026. Anything that's rumor or unverified fan speculation (there's a
lot of it) is explicitly labeled "Unconfirmed" rather than presented as fact.



## Discord Rich Presence

Shows what you're listening to on your Discord profile ("Listening to Nights — by Frank Ocean — Blonde"), with a progress bar and pause state. This needs a one-time setup step since it requires your own free Discord Application:

1. Go to https://discord.com/developers/applications and click **New Application**. Name it whatever you want (e.g. "FO Player").
2. On the application's **General Information** page, copy the **Application ID**.
3. Open `main.js` in the project folder, find this line near the top:
   ```js
   const DISCORD_CLIENT_ID = 'YOUR_DISCORD_CLIENT_ID_HERE';
   ```
   and replace the placeholder with the ID you copied.
4. Restart the app (`npm start`, or relaunch the installed app). Make sure the actual Discord desktop app is running — presence won't show if Discord itself isn't open.

Without this step, the app runs completely normally with presence simply turned off — nothing breaks if you skip it.



## How it works

- **main.js** — Electron's main process. Persists your chosen library folder
  to a small config file, recursively walks it for `.flac` files, and reads
  each file's tags (title/artist/album/track number/duration) and embedded
  cover art using the `music-metadata` library. Also handles the LRCLIB
  lyrics lookup, native window fullscreen (F11), and Discord Rich Presence
  via the `discord-rpc` library.
- **preload.js** — exposes a small, safe `window.api` bridge (config, folder
  picker, rescanning, lyrics lookup, native fullscreen, Discord presence) to
  the renderer, keeping Node access out of the UI itself.
- **discography.js / timeline.js** (in `renderer/`) — static reference data:
  Frank Ocean's official tracklists (for the Missing Tracks checklist) and a
  career timeline (for the About tab). Plain data, no audio or lyrics text.
- **renderer/** — the actual UI: sidebar with album navigation and view
  switching, a searchable track table, a bottom "console" player bar with
  transport controls, seek, volume, shuffle, repeat, and a slide-out lyrics
  panel. Playback uses a plain HTML5 `<audio>` element pointed at `file://`
  URLs — Chromium (which powers Electron) decodes FLAC natively, so no extra
  codec setup is needed.

## Notes

- Only `.flac` files are picked up; everything else in the folder is ignored.
- Title/artist/album/artwork come from each file's own embedded tags. Files
  missing tags fall back to their filename and "Unknown Artist"/"Unknown Album".
- Your library folder is remembered permanently after the first setup — no
  need to reselect it on future launches. Use **Change folder** in the
  sidebar if you ever want to point it elsewhere.
- The only network call this app makes is to LRCLIB, to look up lyrics for
  whatever's currently playing. Everything else — scanning, tagging, playback,
  the missing-tracks checklist — is fully local.
