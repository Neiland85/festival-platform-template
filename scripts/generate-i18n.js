import fs from 'fs'
import path from 'path'

const SRC_DIR = './src'
const NAMESPACE = 'promo'

// Regex para encontrar t('key') o t("key")
const regex = /t\(['"`]([^'"`]+)['"`]\)/g

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)

  list.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath))
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      results.push(filePath)
    }
  })

  return results
}

const files = walk(SRC_DIR)
const keys = new Set()

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8')
  let match

  while ((match = regex.exec(content)) !== null) {
    keys.add(match[1])
  }
})

const sortedKeys = Array.from(keys).sort()

const output = `
export const messages = {
  ${NAMESPACE}: {
${sortedKeys.map(k => `    ${k}: '${k}',`).join('\n')}
  }
}
`

fs.writeFileSync('./generated-messages.ts', output)

console.log('✅ generated-messages.ts creado con', sortedKeys.length, 'keys')
