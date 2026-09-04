const fs = require('fs');

const transcriptPath = 'C:/Users/marjorie.talberg/.gemini/antigravity/brain/5c8f005c-d335-4aab-b994-ce7b6ab7a05f/.system_generated/logs/transcript.jsonl';
const transcript = fs.readFileSync(transcriptPath, 'utf8');
const lines = transcript.split('\n');

// Collect ALL view_file line-numbered content for danca.html
const lineMap = new Map(); // lineNum -> text (from the latest view)

// Also collect all diffs
const diffs = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    
    // Collect VIEW_FILE content
    if (obj.type === 'VIEW_FILE' && obj.content && obj.content.includes('danca.html') && !obj.content.includes('emca.html')) {
      const allContentLines = obj.content.split('\n');
      for (const cl of allContentLines) {
        const match = cl.match(/^(\d+): (.*)/);
        if (match) {
          lineMap.set(parseInt(match[1]), match[2]);
        }
      }
    }
    
    // Collect CODE_ACTION diffs
    if (obj.type === 'CODE_ACTION' && obj.content && obj.content.includes('danca.html')) {
      diffs.push({
        step: obj.step_index,
        content: obj.content,
      });
    }
  } catch(e) {}
}

console.log('Collected', lineMap.size, 'unique line numbers from VIEW_FILE');
console.log('Collected', diffs.length, 'diffs');

// Parse the diffs to extract added/removed lines
// Unified diff format: @@ -oldstart,oldcount +newstart,newcount @@
for (const diff of diffs) {
  // Extract the diff block
  const diffMatch = diff.content.match(/\[diff_block_start\]([\s\S]*?)\[diff_block_end\]/);
  if (diffMatch) {
    const diffContent = diffMatch[1];
    // Parse @@ lines
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
              // Added line
              lineMap.set(lineNum, hl.substring(1));
              lineNum++;
            } else if (hl.startsWith('-')) {
              // Removed line - skip
            } else if (hl.startsWith(' ') || (hl.length > 0 && !hl.startsWith('\\'))) {
              // Context line
              if (hl.startsWith(' ')) {
                lineMap.set(lineNum, hl.substring(1));
              }
              lineNum++;
            }
          }
        }
      }
    }
  }
}

console.log('After applying diffs:', lineMap.size, 'unique line numbers');

// Check coverage
const maxLine = Math.max(...lineMap.keys());
console.log('Max line number:', maxLine);

// Count gaps
let gaps = 0;
for (let i = 1; i <= maxLine; i++) {
  if (!lineMap.has(i)) gaps++;
}
console.log('Missing lines:', gaps, 'out of', maxLine);

// Output what we have
const sortedLines = [...lineMap.entries()].sort((a, b) => a[0] - b[0]);
console.log('\nFirst 10 lines:');
for (const [num, text] of sortedLines.slice(0, 10)) {
  console.log(`  ${num}: ${text.substring(0, 100)}`);
}
console.log('\nLast 10 lines:');
for (const [num, text] of sortedLines.slice(-10)) {
  console.log(`  ${num}: ${text.substring(0, 100)}`);
}

// Show coverage ranges
let inGap = false;
let gapStart = 0;
const gapRanges = [];
for (let i = 1; i <= maxLine; i++) {
  if (!lineMap.has(i)) {
    if (!inGap) { gapStart = i; inGap = true; }
  } else {
    if (inGap) { gapRanges.push([gapStart, i-1]); inGap = false; }
  }
}
if (inGap) gapRanges.push([gapStart, maxLine]);

console.log('\nMissing ranges:');
for (const [start, end] of gapRanges) {
  console.log(`  Lines ${start}-${end} (${end - start + 1} lines)`);
}
