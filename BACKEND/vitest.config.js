/**
 * Vitest configuration
 * Drop-in replacement for Jest with perfect ES modules support
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Enable global test functions (describe, it, expect, etc.)
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'dist', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.js',
        '**/__tests__/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    testTimeout: 10000,
    setupFiles: ['./tests/setup.js'],
  },
});

