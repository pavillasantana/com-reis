const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      
      // Fix display: flex -> display: 'flex'
      content = content.replace(/display:\s*flex/g, "display: 'flex'");
      // Fix display: grid -> display: 'grid'
      content = content.replace(/display:\s*grid/g, "display: 'grid'");
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
