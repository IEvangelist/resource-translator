// One-off: rasterize public/favicon.svg into cross-browser fallback icons.
//
// Modern browsers use the SVG favicon directly, but older engines, RSS/readers,
// social crawlers, and the implicit `/favicon.ico` request need a raster form.
// This emits:
//   - public/favicon.ico        (multi-size 16/32/48, PNG-encoded entries)
//   - public/apple-touch-icon.png (180x180, for iOS home-screen)
//
// Run with sharp available (installed ad-hoc, not a committed dependency):
//   npm install sharp --no-save && node scripts/generate-favicons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "..", "public");
const svgPath = path.join(publicDir, "favicon.svg");
const svg = readFileSync(svgPath);

// Render crisp raster at a high density so the gradient + rings stay smooth.
const renderPng = (size) =>
  sharp(svg, { density: 512 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map(renderPng));

// Assemble an ICO whose entries are PNG payloads (supported since Vista).
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(pngs.length, 4); // image count

const entrySize = 16;
let offset = header.length + entrySize * pngs.length;
const entries = [];
for (let i = 0; i < pngs.length; i++) {
  const size = icoSizes[i];
  const png = pngs[i];
  const entry = Buffer.alloc(entrySize);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // size of image data
  entry.writeUInt32LE(offset, 12); // offset of image data
  entries.push(entry);
  offset += png.length;
}

const ico = Buffer.concat([header, ...entries, ...pngs]);
writeFileSync(path.join(publicDir, "favicon.ico"), ico);

const appleTouch = await sharp(svg, { density: 512 })
  .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(path.join(publicDir, "apple-touch-icon.png"), appleTouch);

console.log(
  JSON.stringify(
    {
      "favicon.ico": ico.length,
      "apple-touch-icon.png": appleTouch.length,
    },
    null,
    2,
  ),
);
