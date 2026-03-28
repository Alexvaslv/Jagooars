const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remove backdrop-blur classes
content = content.replace(/backdrop-blur-[a-z0-9-]*/g, '');

// Remove transition-all where it might cause lag
// content = content.replace(/transition-all/g, 'transition-colors');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Optimized App.tsx');
