import { defineConfig } from 'vitest/config'
import path from 'path'

// Unit-test baseline. Tests live in tests/ and cover pure, dependency-free
// logic (no DB, no React) so they run fast in a plain Node environment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    // Mirror the Next.js "@/*" path alias so tests can import modules that
    // themselves use "@/lib/..." imports (e.g. lib/activityLog.ts).
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
