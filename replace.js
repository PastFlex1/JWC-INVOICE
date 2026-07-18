const fs = require('fs');
const path = require('path');

function replaceInFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      replaceInFiles(path.join(dir, file.name));
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      const filePath = path.join(dir, file.name);
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      if (content.includes("toDataURL('image/png')")) {
        content = content.replace(/toDataURL\('image\/png'\)/g, "toDataURL('image/jpeg', 0.75)");
        modified = true;
      }
      if (content.includes("'PNG'")) {
        content = content.replace(/'PNG'/g, "'JPEG'");
        modified = true;
      }
      if (content.includes("scale: 2")) {
        content = content.replace(/scale:\s*2/g, "scale: 1.5");
        modified = true;
      }
      if (content.includes("scale: 3")) {
        content = content.replace(/scale:\s*3/g, "scale: 1.5");
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log('Updated', filePath);
      }
    }
  }
}
replaceInFiles('src');
