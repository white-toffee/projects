import eslint from '@eslint/js';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  {
    files: ['.cache/app.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        Blob: 'readonly',
        DOMException: 'readonly',
        FileReader: 'readonly',
        HTMLElement: 'readonly',
        Node: 'readonly',
        URL: 'readonly',
        atob: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        document: 'readonly',
        indexedDB: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', {
        caughtErrors: 'none'
      }]
    }
  },
  {
    files: ['desktop/**/*.mjs', 'scripts/**/*.mjs', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        Buffer: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setInterval: 'readonly',
        URL: 'readonly'
      }
    }
  },
  {
    files: ['desktop/preload.mjs'],
    languageOptions: {
      globals: {
        Blob: 'readonly',
        clearTimeout: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly'
      }
    }
  }
];
