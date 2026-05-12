// One-off: produce a 1200x630 og:image from the 1280x720 source.
// Centered crop to the target 1200x630 aspect, then high-quality resize.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "..", "public", "og-image.png");
const out = src;

const TARGET_W = 1200;
const TARGET_H = 630;
const targetAspect = TARGET_W / TARGET_H;

const meta = await sharp(src).metadata();
if (!meta.width || !meta.height) throw new Error("Cannot read source dims");

const srcAspect = meta.width / meta.height;
let cropW = meta.width;
let cropH = meta.height;
if (srcAspect > targetAspect) {
  cropW = Math.round(meta.height * targetAspect);
} else {
  cropH = Math.round(meta.width / targetAspect);
}
const left = Math.round((meta.width - cropW) / 2);
const top = Math.round((meta.height - cropH) / 2);

const buf = await sharp(src)
  .extract({ left, top, width: cropW, height: cropH })
  .resize(TARGET_W, TARGET_H, { fit: "fill", kernel: "lanczos3" })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer();

await sharp(buf).toFile(out);

const finalMeta = await sharp(out).metadata();
console.log(
  JSON.stringify({
    sourceDims: `${meta.width}x${meta.height}`,
    cropped: `${cropW}x${cropH} at (${left},${top})`,
    finalDims: `${finalMeta.width}x${finalMeta.height}`,
    bytes: finalMeta.size,
  }, null, 2),
);
