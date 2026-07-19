// Run: node assets/generate-icons.js
const fs = require('fs');
const path = require('path');

// Creates simple colored SVG icons as placeholder
// Replace these with actual designed icons before publishing

const sizes = {
  'icon.png': 1024,
  'adaptive-icon.png': 1024,
  'favicon.png': 48,
  'splash.png': 1284,
  'notification-icon.png': 96
};

const svg = (size, bg = '#475569', text = 'f') => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <text x="50%" y="54%" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="${size * 0.5}" dy=".35em">${text}</text>
</svg>`;

Object.entries(sizes).forEach(([name, size]) => {
  const content = svg(size);
  const outPath = path.join(__dirname, name.replace('.png', '.svg'));
  fs.writeFileSync(outPath, content.trim());
  console.log(`Created ${outPath}`);
});

console.log('\nReplace SVG files with actual PNG icons before publishing.');
console.log('Recommended sizes:');
console.log('  icon.png: 1024x1024');
console.log('  adaptive-icon.png: 1024x1024');
console.log('  splash.png: 1284x2778 (or matching your splash screen)');
