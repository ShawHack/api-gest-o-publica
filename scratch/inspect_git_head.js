const cp = require('child_process');
const original = cp.execSync('git show HEAD:comtur-next/portal/comtur-content-admin.html', { maxBuffer: 10 * 1024 * 1024 }).toString('utf8');

const s = original.indexOf('id="accountabilityFields"');
// Look for </form> or script tag after accountabilityFields
const scriptIdx = original.indexOf('<script>', s);
console.log('Script tag after accountabilityFields at:', scriptIdx);
console.log(original.substring(scriptIdx - 300, scriptIdx + 200));
