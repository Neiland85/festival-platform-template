import fs from 'fs'

// 🔹 leer generated
const generatedFile = fs.readFileSync('./generated-messages.ts', 'utf-8')

const genMatch = generatedFile.match(/promo:\s*{([\s\S]*?)}/)
const generatedKeys = new Set()

if (genMatch) {
  genMatch[1].split('\n').forEach(line => {
    const m = line.match(/(\w+):/)
    if (m) generatedKeys.add(m[1])
  })
}

// 🔹 leer traducciones reales (JSON REAL)
const realJson = JSON.parse(
  fs.readFileSync('./src/messages/es.json', 'utf-8')
)

const realKeys = new Set(Object.keys(realJson.promo || {}))

const namespace = 'promo'

// 🔥 missing
const missing = [...generatedKeys].filter(k => !realKeys.has(k))

// 🔥 unused
const unused = [...realKeys].filter(k => !generatedKeys.has(k))

if (missing.length) {
  console.log('\n❌ Missing translations:\n')
  missing.forEach(k => console.log(`  - ${namespace}.${k}`))
}

if (unused.length) {
  console.log('\n⚠️ Unused translations:\n')
  unused.forEach(k => console.log(`  - ${namespace}.${k}`))
}

if (!missing.length && !unused.length) {
  console.log('\n✅ i18n OK — todo sincronizado\n')
}

if (missing.length) {
  process.exit(1)
}
