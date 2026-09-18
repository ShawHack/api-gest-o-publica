const fs = require('fs');
const path = require('path');

const enginePath = '/app/public/js/playlist-engine.js';
if (fs.existsSync(enginePath)) {
  let code = fs.readFileSync(enginePath, 'utf8');
  
  if (!code.includes('filterOverlayItems')) {
    code = code.replace(
      'class PlaylistEngine {',
      `function filterOverlayItems(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(i => {
    const s = String(i.subtitle || i.url || '').toLowerCase();
    return !s.includes('29.png') && !s.includes('watermark') && !s.includes('logo') && !s.includes('marca_dagua');
  });
}

class PlaylistEngine {`
    );
    
    code = code.replace(
      'this.playlist = parsed;',
      'this.playlist = filterOverlayItems(parsed);'
    );
    
    code = code.replace(
      'this.playlist = freshPlaylist;',
      'this.playlist = filterOverlayItems(freshPlaylist);'
    );
    
    code = code.replace(
      'this.playlist = newPlaylist;',
      'this.playlist = filterOverlayItems(newPlaylist);'
    );
    
    fs.writeFileSync(enginePath, code, 'utf8');
    console.log('playlist-engine.js patched');
  }
}
