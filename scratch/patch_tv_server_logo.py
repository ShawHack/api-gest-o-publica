import subprocess
import json

script_remote = """
const fs = require('fs');
const path = require('path');

const serverJsPath = '/app/server.js';
let code = fs.readFileSync(serverJsPath, 'utf8');

// Add isOverlayOrWatermark function near top
if (!code.includes('function isOverlayOrWatermark')) {
  code = `function isOverlayOrWatermark(name) {
    if (!name) return false;
    const s = String(name).toLowerCase();
    return s === '29.png' || s.endsWith('/29.png') || s.includes('watermark') || s.includes('logo') || s.includes('marca_dagua');
}\n` + code;
}

// Ensure mediaFilesToDownload checks isOverlayOrWatermark
code = code.replace(
  `if (type === 'media' && (pathName.endsWith('.mp4') || pathName.endsWith('.png') || pathName.endsWith('.jpg') || pathName.endsWith('.jpeg'))) {`,
  `if (type === 'media' && (pathName.endsWith('.mp4') || pathName.endsWith('.png') || pathName.endsWith('.jpg') || pathName.endsWith('.jpeg')) && !isOverlayOrWatermark(pathName)) {`
);

// In loop 2
code = code.replace(
  `if (!newPlaylist.some(p => p.subtitle === item.pathName)) {`,
  `if (!isOverlayOrWatermark(item.pathName) && !newPlaylist.some(p => p.subtitle === item.pathName)) {`
);

// In loadPlaylist
code = code.replace(
  `function loadPlaylist(displayId = 'default') {
    const playlistFile = getDisplayPlaylistFile(displayId);
    if (fs.existsSync(playlistFile)) {
        try {
            return JSON.parse(fs.readFileSync(playlistFile, 'utf8'));
        } catch (e) {}
    }`,
  `function loadPlaylist(displayId = 'default') {
    const playlistFile = getDisplayPlaylistFile(displayId);
    if (fs.existsSync(playlistFile)) {
        try {
            const raw = JSON.parse(fs.readFileSync(playlistFile, 'utf8'));
            if (Array.isArray(raw)) {
                return raw.filter(item => !isOverlayOrWatermark(item.subtitle) && !isOverlayOrWatermark(item.url));
            }
        } catch (e) {}
    }`
);

fs.writeFileSync(serverJsPath, code, 'utf8');
console.log('server.js patched successfully');

// Clean /app/data/playlist.json
const playlistPath = '/app/data/playlist.json';
if (fs.existsSync(playlistPath)) {
  try {
    const pl = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
    const filtered = pl.filter(i => {
      const sub = (i.subtitle || i.url || '').toLowerCase();
      return !sub.includes('29.png') && !sub.includes('watermark') && !sub.includes('logo');
    });
    fs.writeFileSync(playlistPath, JSON.stringify(filtered, null, 2), 'utf8');
    console.log('playlist.json cleaned, remaining items:', filtered.length);
  } catch (e) {
    console.error('Error cleaning playlist.json:', e);
  }
}
"""

with open("scratch/patch_tv_server_logo.js", "w", encoding="utf-8") as f:
    f.write(script_remote)

print("Saved local script")
