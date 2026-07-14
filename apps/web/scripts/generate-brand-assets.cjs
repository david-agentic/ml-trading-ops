// One-off local asset generation — see apps/web/public/brand/README.md.
// Not a build step; run manually with `node scripts/generate-brand-assets.cjs`
// whenever the source PNGs change.
const path = require('path');
const Jimp = require('jimp');
const pngToIco = require('png-to-ico');

const SOURCE_DIR = path.join(__dirname, '..', 'public', 'brand', 'source');
const BRAND_DIR = path.join(__dirname, '..', 'public', 'brand');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function makeTransparent(image) {
  const bgIdx = image.getPixelIndex(2, 2);
  const bgR = image.bitmap.data[bgIdx + 0];
  const bgG = image.bitmap.data[bgIdx + 1];
  const bgB = image.bitmap.data[bgIdx + 2];

  const LOW = 12;
  const HIGH = 40;

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function scanner(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    const alpha = Math.max(0, Math.min(255, ((dist - LOW) / (HIGH - LOW)) * 255));
    this.bitmap.data[idx + 3] = Math.round(alpha);
  });

  return image;
}

async function main() {
  console.log('Reading source PNGs...');
  const iconSource = await Jimp.read(path.join(SOURCE_DIR, 'logo-icon-source.png'));
  const fullSource = await Jimp.read(path.join(SOURCE_DIR, 'logo-full-source.png'));

  console.log('Making backgrounds transparent...');
  const iconTransparent = (await makeTransparent(iconSource.clone())).autocrop();
  const fullTransparent = (await makeTransparent(fullSource.clone())).autocrop();

  console.log('Writing logo-icon.png and logo-full.png...');
  await iconTransparent.clone().writeAsync(path.join(BRAND_DIR, 'logo-icon.png'));
  await fullTransparent.clone().writeAsync(path.join(BRAND_DIR, 'logo-full.png'));

  console.log('Writing PWA icon sizes...');
  await iconTransparent.clone().resize(192, 192).writeAsync(path.join(PUBLIC_DIR, 'icon-192.png'));
  await iconTransparent.clone().resize(512, 512).writeAsync(path.join(PUBLIC_DIR, 'icon-512.png'));

  // apple-touch-icon must NOT be transparent (iOS renders transparency as
  // black) — flatten onto the brand primary-muted surface color instead.
  const appleTouchBg = new Jimp(180, 180, 0xf1f3f5ff);
  const appleTouchIcon = iconTransparent.clone().resize(140, 140);
  appleTouchBg.composite(appleTouchIcon, 20, 20);
  await appleTouchBg.writeAsync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  console.log('Writing favicon.ico...');
  const favicon32 = await iconTransparent.clone().resize(32, 32).getBufferAsync(Jimp.MIME_PNG);
  const favicon16 = await iconTransparent.clone().resize(16, 16).getBufferAsync(Jimp.MIME_PNG);
  const icoBuffer = await pngToIco([favicon32, favicon16]);
  require('fs').writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
