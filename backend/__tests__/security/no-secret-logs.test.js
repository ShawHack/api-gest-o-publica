const fs = require('fs');
const path = require('path');

describe('segurança — logs', () => {
  test('helpers não logam JWT_SECRET', () => {
    const helpersDir = path.join(__dirname, '../../helpers');
    const files = fs.readdirSync(helpersDir).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(helpersDir, file), 'utf8');
      expect(content).not.toMatch(/JWT_SECRET.*console\.log/i);
      expect(content).not.toMatch(/console\.log\([^)]*JWT_SECRET/i);
    }
  });
});
