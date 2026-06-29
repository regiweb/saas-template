// EZL-025: ESLint baseline for packages/web (flat config, ESLint 9).
// Conservative start — recommended rules, but noisy stylistic ones are warnings
// so the baseline stays green on existing code; teams tighten over time.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },
  {
    // Test files + setup run under node + vitest globals.
    files: ['src/**/*.{test,spec}.{js,jsx}', 'src/test/**'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Root config files (vite/vitest/eslint) run in Node.
    files: ['*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
]
