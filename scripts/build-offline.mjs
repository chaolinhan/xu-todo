import { readdir, readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { Script } from 'node:vm'

const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const output = option('--dir', 'dist')
const base = option('--base', '/')
if (!output || !base || !/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('Expected an absolute deployment base ending in /')
async function files(dir) {
  const result = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) result.push(...await files(path))
    else result.push(path)
  }
  return result
}
const assets = (await files(output)).filter(file => !file.endsWith('/sw.js'))
const hash = createHash('sha256')
for (const file of assets.sort()) hash.update(await readFile(file))
const version = hash.digest('hex').slice(0, 16)
const urls = assets.map(file => `${base}${file.slice(output.length + 1)}`)
let worker = await readFile('public/sw.js', 'utf8')
worker = worker.replace('__CACHE_VERSION__', version).replace('/* __ASSETS__ */ []', JSON.stringify(urls))
new Script(worker, { filename: 'sw.js' })
await writeFile(`${output}/sw.js`, worker)
if (!args.includes('--no-portable')) {
  if (base !== '/') throw new Error('Windows portable builds must use the root deployment base')
  await mkdir('release/xiaoxu-offline', { recursive: true })
  await rm('release/xiaoxu-offline/app', { recursive: true, force: true })
  await cp(output, 'release/xiaoxu-offline/app', { recursive: true })
  await cp('scripts/portable', 'release/xiaoxu-offline', { recursive: true })
}
console.log(`Offline shell ${version}: ${assets.length} assets at ${base}`)
