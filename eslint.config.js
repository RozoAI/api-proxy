import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'prettier': prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...eslintConfigPrettier.rules,
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      '@typescript-eslint/no-explicit-any': 'off', // Temporarily disable any type warnings
      'prettier/prettier': ['error', {
        semi: true,
        trailingComma: 'es5',
        singleQuote: true,
        printWidth: 100,
        tabWidth: 2,
        useTabs: false,
        endOfLine: 'auto',
      }],
      '@typescript-eslint/ban-types': ['error', {
        types: {
          'Function': {
            message: 'Specify the function type instead',
            fixWith: '(...args: any[]) => any',
          },
        },
      }],
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/no-loss-of-precision': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'off', // Temporarily disable unsafe assignment warnings
      '@typescript-eslint/no-unsafe-member-access': 'off', // Temporarily disable unsafe member access warnings
      '@typescript-eslint/no-unsafe-call': 'off', // Temporarily disable unsafe call warnings
      '@typescript-eslint/no-unsafe-return': 'off', // Temporarily disable unsafe return warnings
    },
  },
]; 