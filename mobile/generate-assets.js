// Run: node assets/generate-assets.js
// Generates PNG splash screens, icons, and adaptive icons for Pulse mobile
// Requires: npm install canvas (dev dependency)
//
// If canvas is not available, the SVG files can be used directly
// by updating app.config.js to reference .svg files instead of .png

const fs = require('fs');
const path = require('path');

const SPLASH_WIDTH = 1284;
const SPLASH_HEIGHT = 2778;
const ICON_SIZE = 1024;

function createMinimalPNG(width, height, r, g, b) {
  // Creates a solid-color PNG using raw zlib compression
  const zlib = require('zlib');

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // Image data: each row starts with filter byte 0 (no filter)
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 3;
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idat = createChunk('IDAT', compressed);

  // IEND
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

const apps = {
  pulse: {
    bg: '#1a1a2e',
    splashBg: '#1a1a2e',
    iconBg: '#0084ff',
  },
  whisper: {
    bg: '#000000',
    splashBg: '#000000',
    iconBg: '#181818',
  }
};

Object.entries(apps).forEach(([name, config]) => {
  const assetsDir = path.join(__dirname, name, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Generate splash.png
  const splashRgb = hexToRgb(config.splashBg);
  const splashPng = createMinimalPNG(SPLASH_WIDTH, SPLASH_HEIGHT, splashRgb.r, splashRgb.g, splashRgb.b);
  const splashPath = path.join(assetsDir, 'splash.png');
  fs.writeFileSync(splashPath, splashPng);
  console.log(`Created ${splashPath} (${SPLASH_WIDTH}x${SPLASH_HEIGHT})`);

  // Generate icon.png
  const iconRgb = hexToRgb(config.iconBg);
  const iconPng = createMinimalPNG(ICON_SIZE, ICON_SIZE, iconRgb.r, iconRgb.g, iconRgb.b);
  const iconPath = path.join(assetsDir, 'icon.png');
  fs.writeFileSync(iconPath, iconPng);
  console.log(`Created ${iconPath} (${ICON_SIZE}x${ICON_SIZE})`);

  // Generate adaptive-icon.png (same as icon)
  const adaptivePath = path.join(assetsDir, 'adaptive-icon.png');
  fs.writeFileSync(adaptivePath, iconPng);
  console.log(`Created ${adaptivePath} (${ICON_SIZE}x${ICON_SIZE})`);

  // Generate favicon.png (48x48)
  const faviconPng = createMinimalPNG(48, 48, iconRgb.r, iconRgb.g, iconRgb.b);
  const faviconPath = path.join(assetsDir, 'favicon.png');
  fs.writeFileSync(faviconPath, faviconPng);
  console.log(`Created ${faviconPath} (48x48)`);
});

console.log('\nDone! PNG assets generated for pulse and whisper.');
console.log('Note: These are solid-color placeholders. Replace with designed assets for production.');
