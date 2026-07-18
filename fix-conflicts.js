const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('<<<<<<< HEAD')) return;
    
    const lines = content.split(/\r?\n/);
    const newLines = [];
    let state = 'NORMAL';
    let fixed = false;
    
    for (let line of lines) {
      if (line.startsWith('<<<<<<< HEAD')) {
        state = 'IN_HEAD';
        fixed = true;
        continue;
      }
      if (line.startsWith('=======')) {
        if (state === 'IN_HEAD') {
          state = 'IN_REMOTE';
          continue;
        }
      }
      if (line.startsWith('>>>>>>>')) {
        if (state === 'IN_REMOTE' || state === 'IN_HEAD') {
          state = 'NORMAL';
          continue;
        }
      }
      
      if (state === 'NORMAL' || state === 'IN_HEAD') {
        newLines.push(line);
      }
    }
    
    if (fixed) {
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
      console.log('Fixed ' + filePath);
    }
  } catch (e) {
    console.error('Error processing ' + filePath + ':', e);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (let file of files) {
    if (file === 'node_modules' || file === '.git' || file === '.next' || file === 'package-lock.json') continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

walk(__dirname);
