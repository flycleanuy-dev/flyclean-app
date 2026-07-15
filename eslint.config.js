// ESLint 9 (flat config) — F0 de la modularización (2026-07-15).
// Alcance: SOLO el código ya modularizado (api/ = 38 archivos ESM, scripts/, tests/). `index.html` queda
// FUERA a propósito: hoy es el monolito (JS inline, scope global, 443 onclick) — lintearlo sería un mar de
// falsos positivos sin valor. Entra cuando la modularización lo parta en /src (ahí cada módulo nace limpio).
//
// Filosofía: el linter caza ERRORES (variables sin usar, promesas mal manejadas, typos), NO estilo — del
// estilo se ocupa Prettier (eslint-config-prettier apaga las reglas que chocarían).
import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['node_modules/**', 'vendor/**', 'index.html', 'docs/**', '.vercel/**'] },

  // Backend (Vercel serverless) + scripts + tests: Node, ESM.
  {
    files: ['api/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Errores reales que queremos ver:
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          // `catch (_) {}` / `catch (e) {}` sin usar el error es DELIBERADO en todo el código
          // (best-effort: "si falla, seguimos"). Cada uno tiene su comentario del porqué.
          caughtErrorsIgnorePattern: '^_$|^e$',
        },
      ],
      'no-undef': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      eqeqeq: ['warn', 'smart'], // `== null` (null/undefined a la vez) es intencional en el código
      'no-console': 'off', // los crons/serverless loguean a propósito
      // OFF a propósito: pelea con el patrón FAIL-CLOSED del código de seguridad
      // (`let valid = false;` antes de un if/else que siempre reasigna). Inicializar en el valor
      // seguro es MÁS defensivo que dejarlo sin inicializar — la regla lo llama "inútil".
      'no-useless-assignment': 'off',
    },
  },

  // Scripts CommonJS (generadores de manuales con Playwright). Corren en Node PERO inyectan callbacks que
  // se ejecutan DENTRO del navegador (page.evaluate) → ahí viven `document` y las funciones de la app
  // (setCoordTab, openConfigSheet…). Por eso: globals del browser + no-undef OFF (el linter no puede saber
  // qué existe en el contexto de la página; pretenderlo daría 61 falsos positivos).
  {
    files: ['scripts/**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_$|^e$' },
      ],
      'no-undef': 'off', // ver nota de arriba (código que corre en el browser vía page.evaluate)
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-assignment': 'off',
      'no-console': 'off',
    },
  },

  prettier, // debe ir ÚLTIMO: apaga toda regla de ESLint que pelee con Prettier
];
