import { defineConfig } from 'vitest/config'

// Unit-test baseline. Tests live in tests/ and cover pure, dependency-free
// logic (no DB, no React) so they run fast in a plain Node environment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
