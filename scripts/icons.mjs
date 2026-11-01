// Renders the spendy app icons into public/ (and the native iOS icon + launch
// screen when ios/ exists). Run with `npm run icons`.
import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'

const BRAND = '#2a78d6'
const TINT = '#cde2fb'

// A wallet with a card peeking out. Artwork stays inside the maskable safe zone.
const art = `
  <g transform="translate(256 256) scale(var) translate(-256 -256)">
    <rect x="160" y="132" width="180" height="84" rx="20" fill="${TINT}" transform="rotate(-10 250 174)"/>
    <rect x="128" y="172" width="256" height="188" rx="40" fill="#ffffff"/>
    <rect x="300" y="234" width="108" height="64" rx="32" fill="${TINT}"/>
    <circle cx="336" cy="266" r="13" fill="${BRAND}"/>
  </g>`

const svg = ({ rounded, scale }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="${BRAND}"/>
  ${art.replace('var', String(scale))}
</svg>`

const any = svg({ rounded: true, scale: 1 })
const full = svg({ rounded: false, scale: 1 })
const maskable = svg({ rounded: false, scale: 0.82 })

const png = (src, size, out) =>
  sharp(Buffer.from(src)).resize(size, size).png().toFile(`public/${out}`)

await writeFile('public/favicon.svg', any)
await Promise.all([
  png(any, 192, 'pwa-192.png'),
  png(any, 512, 'pwa-512.png'),
  png(maskable, 512, 'maskable-512.png'),
  // iOS applies its own corner mask, so this one is full-bleed.
  png(full, 180, 'apple-touch-icon.png'),
])
console.log('icons written to public/')

const IOS_ASSETS = 'ios/App/App/Assets.xcassets'
if (existsSync(IOS_ASSETS)) {
  // App Store icons must be opaque, so flatten away the alpha channel.
  await sharp(Buffer.from(full)).resize(1024, 1024).flatten().png()
    .toFile(`${IOS_ASSETS}/AppIcon.appiconset/AppIcon-512@2x.png`)
  // Launch screen: the wallet small and centred on brand blue (shown aspect-filled).
  const splash = await sharp(Buffer.from(svg({ rounded: false, scale: 0.22 }))).resize(2732, 2732).flatten().png().toBuffer()
  await Promise.all(
    ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'].map((f) =>
      writeFile(`${IOS_ASSETS}/Splash.imageset/${f}`, splash),
    ),
  )
  console.log('iOS icon and launch screen written')
}
