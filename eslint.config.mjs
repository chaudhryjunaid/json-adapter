import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';


export default [
  {
    files: ['**/*.ts', '**/*.tsx'], // Apply to all TypeScript files
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: process.cwd(),
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules, // Recommended TypeScript rules
      ...prettierConfig.rules, // Prettier-compatible rules

      // Custom rules (matching your .eslintrc.js)
      "@typescript-eslint/no-floating-promises": "error",
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'prettier/prettier': ['warn'], // Prettier plugin integration
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'], // Apply to JavaScript files
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': ['warn'], // Prettier plugin integration
    },
  },
  {
    ignores: ['.eslintrc.js', 'dist/**', 'node_modules/**'], // Match your ignored patterns
  },
];
