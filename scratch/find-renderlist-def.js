const fs = require('fs');
const content = fs.readFileSync('comtur-next/portal/comtur-content-admin.html', 'utf8');

const regex = /renderList\s*=\s*function|\bfunction\s+renderList/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log('Found renderList definition at', match.index);
  console.log(content.substring(match.index, match.index + 500));
}

const regex2 = /loadItemForEdit\s*=\s*function|\bfunction\s+loadItemForEdit/g;
while ((match = regex2.exec(content)) !== null) {
  console.log('Found loadItemForEdit definition at', match.index);
  console.log(content.substring(match.index, match.index + 500));
}
