import { defineConfig } from 'vitest/config'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import path from 'path'

function loadEnvFile(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(resolve(process.cwd(), filePath), 'utf-8')
    const vars: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const match = line.trim().match(/^([^#=][^=]*)=(.*)$/)
      if (match) vars[match[1].trim()] = match[2].trim()
    }
    return vars
  } catch {
    return {}
  }
}

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    globals: true,
    testTimeout: 15000,
    hookTimeout: 20000,
    env: loadEnvFile('.env.test.local'),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
