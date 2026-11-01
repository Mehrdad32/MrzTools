import { mkdir, writeFile } from 'node:fs/promises'

const commit = 'fedeba81519770109925b5bec70e940be5948d8f'
const root = 'https://raw.githubusercontent.com/jaycee723/ocr-b/' + commit + '/'
async function download(relative) {
  const response = await fetch(root + relative, { signal: AbortSignal.timeout(18000) })
  if (!response.ok) throw new Error('Cannot fetch OCR-B resource: ' + relative + ' / HTTP ' + response.status)
  return Buffer.from(await response.arrayBuffer())
}
const [font, license] = await Promise.all([download('dist/OCR-B.ttf'),download('LICENSE.md')])
if(font.length < 10000 || font.length > 150000 || font[0] !== 0 || font[1] !== 1) {
  throw new Error('OCR-B file failed TrueType signature / size validation.')
}
if(!license.toString('utf8').includes('SIL OPEN FONT LICENSE')){
  throw new Error('Font license validation failed.')
}
await mkdir('public/fonts',{recursive:true})
await Promise.all([
  writeFile('public/fonts/OCR-B.ttf',font),
  writeFile('public/fonts/OFL.txt',license),
])
console.log('Downloaded pinned OCR-B font (SIL OFL-1.1) and license for self-hosting.')
