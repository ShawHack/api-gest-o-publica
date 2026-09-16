const fs = require('fs');
const backup = fs.readFileSync('comtur-next/_backup_pre_rebuild_20260914/comtur-content-admin.html', 'utf8');

console.log('Backup size:', backup.length);
const onCt = backup.indexOf('window.onContentTypeChange = function');
console.log(backup.substring(onCt, onCt + 3500));
