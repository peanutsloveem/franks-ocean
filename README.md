# FO Player

A native Windows desktop app that turns a local folder of your own FLAC files into a proper music library (i was bored)

![image](https://github.com/peanutsloveem/franks-ocean/blob/main/preview)

It doesn't ship with any music, you have to install them on your own, I'm not saying where. Point it at a folder on your own drive that already contains your FLAC files, and it builds the library from what's there.

## Requirements

- [Node.js](https://nodejs.org) 18 or newer (includes npm)
- Windows 10/11 (for the packaged app) — you can also run it in dev mode on macOS/Linux, since Electron itself is cross-platform

## Run it in development

```bash
cd folder/to/franks-ocean
npm install
npm start
```

A window opens. The **first time only**, it'll ask you to pick your library folder (subfolders are scanned too). After that it remembers the folder and scans it automatically every time you launch the app — no picker, no button.

If you add or remove files later, click **Rescan library** in the sidebar. **Change folder** lets you point it somewhere else entirely.

## Missing Tracks tab

The sidebar has a **Missing Tracks** view. It checks your library against Frank Ocean's official discography (titles and track numbers only — no audio, no lyrics) and lists anything it couldn't match to a file you already have, along with the exact filename it's expecting (e.g. `09 - Nights.flac`).

This is a checklist, not a downloader — the app doesn't search the internet for or fetch any audio itself. You source the file yourself, drop it in your library folder using the suggested filename, and hit **Rescan library**.

## Lyrics

Click the **Aa** button in the player bar to open the lyrics panel. It looks up synced lyrics for the currently playing track via the [LRCLIB](https://lrclib.net) public API (a free, crowd-sourced lyrics database) and highlights the current line in time with playback, karaoke-style. Results are cached locally so the same track won't re-fetch on every play. If LRCLIB doesn't have a match, or only has plain (unsynced) text, that's what you'll see instead.

## About Frank Ocean

A timeline tab covering confirmed career milestones from the mid-2000s through 2026. Anything that's rumor or unverified fan speculation (there's a lot of it) is explicitly labeled "Unconfirmed" rather than presented as fact. This will be changed soon.

## Discord Rich Presence

Shows what you're listening to on your Discord profile ("Listening to Nights — by Frank Ocean — Blonde"), with a progress bar and pause state.

## Notes

- Only `.flac` files are picked up; everything else in the folder is ignored.
- Title/artist/album/artwork come from each file's own embedded tags. Files missing tags fall back to their filename and "Unknown Artist"/"Unknown Album".
- Your library folder is remembered permanently after the first setup — no need to reselect it on future launches. Use **Change folder** in the sidebar if you ever want to point it elsewhere.
- The only network call this app makes is to LRCLIB, to look up lyrics for whatever's currently playing. Everything else — scanning, tagging, playback, the missing-tracks checklist — is fully local.
