import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'vite-project-example',
      '**/*.config.*',
      'vite.config.ts',
      '**/*.test.ts',
      '**/*.test.tsx',
      'src/test/**/*',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'complexity': ['error', { max: 15 }],
      'max-params': ['error', { max: 4 }],
      'max-lines': ['error', {
        max: 400,
        skipBlankLines: true,
        skipComments: true,
      }],
      'max-lines-per-function': ['error', {
        max: 50,
        skipBlankLines: true,
        skipComments: true,
      }],
      'max-depth': ['error', { max: 3 }],
      'max-len': ['error', {
        code: 120,
        ignorePattern: '^\\s*(//|\\*)',
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      }],

      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': ['error', {
        ignore: [0, 1, -1, 2],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        ignoreEnums: true,
        ignoreNumericLiteralTypes: true,
        ignoreReadonlyClassProperties: true,
        ignoreTypeIndexes: true,
      }],

      'no-unreachable': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      'no-constant-condition': 'error',
      'no-debugger': 'error',
      'no-empty': 'error',
      'no-empty-function': 'off',
      '@typescript-eslint/no-empty-function': 'error',
      'no-lonely-if': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'curly': ['error', 'all'],
      'no-useless-return': 'error',

      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'object-shorthand': 'error',

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],

      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', {
        allowConstantExport: true,
      }],
      'react/prop-types': 'off',

      'no-console': 'off',
    },
  },
);
