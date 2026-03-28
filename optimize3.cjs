const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace complex gradients with solid colors to improve performance and remove gradients
content = content.replace(/bg-gradient-to-[a-z]+ from-\[[^\]]+\] to-\[[^\]]+\]/g, 'bg-blue-600');
content = content.replace(/bg-gradient-to-[a-z]+ from-[a-z0-9-]+ to-[a-z0-9-]+/g, 'bg-blue-600');
content = content.replace(/bg-gradient-to-[a-z]+ from-[a-z0-9-\/]+ via-[a-z0-9-\/]+ to-[a-z0-9-\/]+/g, 'bg-blue-600');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Removed gradients from App.tsx');
