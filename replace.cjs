const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/bg-slate-100/g, 'bg-[#2A2B36]');
content = content.replace(/hover:bg-slate-200/g, 'hover:bg-[#3A3B4C]');
content = content.replace(/text-slate-900/g, 'text-white');
content = content.replace(/bg-orange-100/g, 'bg-orange-900/30');
content = content.replace(/text-orange-700/g, 'text-orange-300');
content = content.replace(/bg-cyan-100/g, 'bg-cyan-900/30');
content = content.replace(/text-cyan-700/g, 'text-cyan-300');
content = content.replace(/bg-red-100/g, 'bg-red-900/30');
content = content.replace(/text-red-700/g, 'text-red-300');
content = content.replace(/border-white/g, 'border-[#1A1B22]');
content = content.replace(/bg-white\/50/g, 'bg-[#22232E]/50');
content = content.replace(/bg-white\/80/g, 'bg-[#22232E]/80');
content = content.replace(/bg-white\/90/g, 'bg-[#22232E]/90');
content = content.replace(/bg-white\/20/g, 'bg-[#22232E]/20');
content = content.replace(/bg-white\/40/g, 'bg-[#22232E]/40');

fs.writeFileSync('src/App.tsx', content);
console.log('Done');
