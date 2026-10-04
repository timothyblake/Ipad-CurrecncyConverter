import sharp from 'sharp';
// Render every platform icon from the same vector master.
for (const [size, name] of [[32, 'favicon-currency-32'], [180, 'apple-touch-icon'], [192, 'icon-192'], [512, 'icon-512']]) {
  await sharp('public/favicon-currency.svg').resize(size, size).png().toFile(`public/${name}.png`);
}
