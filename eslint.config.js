import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'design', '.wrangler', 'coverage', '.claude'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // The app reaches the engine only through its entry point (ADR-0003).
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@investment-tycoon/engine/*', '**/packages/engine/**'],
              message: "Import from '@investment-tycoon/engine' only.",
            },
          ],
        },
      ],
    },
  },
  {
    // The engine must stay framework-free and deterministic (docs/ARCHITECTURE.md §1–2).
    files: ['packages/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-dom', 'react/*', 'zustand', '../../*'] },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG (src/rng.ts).' },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage'],
    },
  },
);
