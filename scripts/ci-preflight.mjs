// FILE: scripts/ci-preflight.mjs
// Why: Fail early with a clear message if common Netlify issues exist.
import fs from 'node:fs'
import path from 'node:path'

function die(msg){ console.error('[preflight] ' + msg); process.exit(2) }
function ok(msg){ console.log('[preflight] ' + msg) }

const root = process.cwd()
const reqFiles = [
  'vite.config.ts',
  'src/App.vue',
  'src/main.ts',
  'src/style.css',
  'src/utils/barcode.ts',
  'src/utils/exporters.ts'
]
for(const f of reqFiles){
  const p = path.join(root, f)
  if(!fs.existsSync(p)) die(`Missing required file: ${f}`)
}
ok('Required files exist')

const mainTs = fs.readFileSync(path.join(root,'src/main.ts'),'utf8')
if(!mainTs.includes(`'./style.css'`) && !mainTs.includes(`"./style.css"`)){
  die(`src/main.ts must import "./style.css" (path must be inside src/)`)
}
ok('CSS import path looks correct')

const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'))
if(!(pkg.devDependencies && pkg.devDependencies['@vitejs/plugin-vue'])){
  die('Missing devDependency: @vitejs/plugin-vue')
}
ok('@vitejs/plugin-vue present')

const barcode = fs.readFileSync(path.join(root,'src/utils/barcode.ts'),'utf8')
const need = [
  'export const ALL_FORMATS',
  'export const DEFAULT_TRIMS',
  'export const LINEAR_GROUP',
  'export const MATRIX_GROUP',
  'export type TrimRules',
  'export type Format',
  'export function applyTrims',
  'export function stripCheckDigit',
  'export function validateCheckDigit'
]
const missing = need.filter(sig => !barcode.includes(sig))
if(missing.length){
  die(`barcode.ts missing exports:\n  - ${missing.join('\n  - ')}`)
}
ok('barcode.ts exports verified')

const app = fs.readFileSync(path.join(root,'src/App.vue'),'utf8')
// crude check to catch case-sensitive import issues on Linux
if(app.includes('./utils/Barcode') || app.includes('./Utils/')){
  die('Case-sensitive path issue in imports inside src/App.vue (Linux fs is case-sensitive)')
}
ok('App.vue imports look case-correct')

ok('Preflight passed')
