const fs = require('fs');

const transcriptPath = 'C:/Users/marjorie.talberg/.gemini/antigravity/brain/5c8f005c-d335-4aab-b994-ce7b6ab7a05f/.system_generated/logs/transcript.jsonl';
const transcript = fs.readFileSync(transcriptPath, 'utf8');

const lineMap = new Map();
const diffs = [];

const lines = transcript.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'VIEW_FILE' && obj.content && obj.content.includes('danca.html') && !obj.content.includes('emca.html')) {
      const allContentLines = obj.content.split('\n');
      for (const cl of allContentLines) {
        const match = cl.match(/^(\d+): (.*)/);
        if (match) lineMap.set(parseInt(match[1]), match[2]);
      }
    }
    if (obj.type === 'CODE_ACTION' && obj.content && obj.content.includes('danca.html')) {
      diffs.push(obj.content);
    }
  } catch(e) {}
}

for (const diff of diffs) {
  const diffMatch = diff.match(/\[diff_block_start\]([\s\S]*?)\[diff_block_end\]/);
  if (diffMatch) {
    const diffContent = diffMatch[1];
    const hunks = diffContent.split(/@@\s+-\d+,?\d*\s+\+\d+,?\d*\s+@@/);
    const headers = diffContent.match(/@@\s+-(\d+),?(\d*)\s+\+(\d+),?(\d*)\s+@@/g);
    if (headers) {
      for (let h = 0; h < headers.length; h++) {
        const headerMatch = headers[h].match(/@@\s+-(\d+),?(\d*)\s+\+(\d+),?(\d*)\s+@@/);
        if (headerMatch) {
          const newStart = parseInt(headerMatch[3]);
          const hunkContent = hunks[h + 1] || '';
          const hunkLines = hunkContent.split('\n');
          let lineNum = newStart;
          for (const hl of hunkLines) {
            if (hl.startsWith('+')) {
              lineMap.set(lineNum++, hl.substring(1));
            } else if (hl.startsWith(' ') || (hl.length > 0 && !hl.startsWith('\\'))) {
              if (hl.startsWith(' ')) lineMap.set(lineNum, hl.substring(1));
              lineNum++;
            }
          }
        }
      }
    }
  }
}

// Extract any HTML chunks from tool_calls args directly
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.tool_calls) {
      for (const tc of obj.tool_calls) {
        if (tc.name === 'run_command' || tc.name === 'write_to_file' || tc.name.includes('replace')) {
          const argsStr = JSON.stringify(tc.args);
          if (argsStr.includes('bannerballet') || argsStr.includes('carousel')) {
            const htmlMatches = argsStr.match(/<section[\s\S]*?<\/section>/g);
            if (htmlMatches) {
              console.log('Found full section block in step', obj.step_index);
              for (const m of htmlMatches) {
                if (m.includes('banner')) {
                   fs.writeFileSync('c:/Users/marjorie.talberg/Desktop/teatro/emca/cursos/danca_banner_section.html', m.replace(/\\n/g, '\n').replace(/\\"/g, '"'), 'utf8');
                }
              }
            }
          }
        }
      }
    }
  } catch(e) {}
}

let out = '';
const maxLine = Math.max(...lineMap.keys());
for (let i = 1; i <= maxLine; i++) {
  if (lineMap.has(i)) out += lineMap.get(i) + '\n';
  else out += '<!-- GAP ' + i + ' -->\n';
}
fs.writeFileSync('c:/Users/marjorie.talberg/Desktop/teatro/emca/cursos/danca_partial.html', out, 'utf8');
console.log('Saved danca_partial.html');
