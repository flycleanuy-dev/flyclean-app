# Método de Loops — FlyClean (construir bien + auditar bien, cada vez)

> **Para qué:** que cuando Diego pida construir algo salga **la mejor versión**, y cuando pida auditar salga
> **la mejor auditoría** — de forma repetible (no por suerte). Replicable a El Parrillero (cambia solo el stack).
>
> **Principio (lo que un experto en Claude recomienda):** la calidad NO la pone el bucle — la pone el **SPEC**
> (el criterio de "qué está bien hecho") + la **verificación adversaria** + **Diego como juez final**. El loop
> solo hace converger hacia eso.
>
> **⚠️ Cuándo se usa (opt-in — NO corre solo):** esto es **una herramienta más**, no el modo por defecto.
> Por defecto **seguimos trabajando como siempre** (Diego pide → lo hago directo, con plan mode si el cambio de
> código no es trivial). El loop formal arranca **solo cuando Diego escribe el gatillo al inicio del mensaje**:
> - **Loop de construcción** → escribí **«loop de construccion»** al inicio (ej. «loop de construccion: quiero X»).
> - **Loop de auditoría** → escribí **«loop de auditoria»** al inicio (ej. «loop de auditoria: el proyecto X»).
>
> Reconozco el gatillo sin distinguir mayúsculas ni acentos. Sin esas frases al inicio, NO disparo la entrevista
> de spec ni la cadena completa.

---

## 🔁 LOOP DE CONSTRUCCIÓN  (gatillo: «loop de construccion» al inicio del mensaje)

Cuando escribís «loop de construccion», ejecuto estos pasos en orden:

**0. Anti-redundancia (obligatorio).** Leer `docs/FUNCIONALIDADES.md` + grep del código para confirmar que NO
exista ya. Si existe algo parecido → reusar, no reconstruir. (Ya nos pasó: Clientes/Contactos, PINs.)

**1. SPEC — entrevista (1 pregunta a la vez)** · skill **`brainstorming`**. No codeo nada hasta cerrar el contrato. El spec tiene 5 partes:
   - **Objetivo** — qué problema resuelve.
   - **Requisitos** — qué tiene que hacer.
   - **Restricciones** — qué NO romper (no tocar esquema Notion sin avisar, no romper UY, reversible, etc.).
   - **Casos borde** — multi-país, sin conexión, datos vacíos, etc.
   - **Definición de "HECHO" verificable** — criterios chequeables (ej. "un Finanzas de Panamá ve 0 de Uruguay").
   → Se guarda en `docs/specs/<nombre>.md`. **Acá está el 80% del resultado.**

**2. BUILD — construir EXACTAMENTE el spec** (sin features de más) · skills **`writing-plans`** → **`executing-plans`** /
   **`subagent-driven-development`** + **`test-driven-development`**. Con las convenciones FlyClean:
   single `index.html`, proxy `/api/notion`, reusar helpers existentes, **bump de `sw.js`**, rama → PR → CI → merge.

**3. REVISAR — el loop de calidad (lo que da "la mejor versión")** · skills **`verification-before-completion`** +
   **`requesting-code-review`** / **`receiving-code-review`** + **`systematic-debugging`**:
   - `node tests/check-html.mjs` + `npm test` (smoke) + **Playwright en prod** contra CADA "hecho verificable".
   - **Pasada adversaria**: buscar a propósito huecos / bugs / casos borde no cubiertos / fugas (ej. la fuga de
     "cobros sin asociar" por país que encontré). Arreglar → re-verificar. Repetir hasta que pase TODO.
   - Mostrar a Diego → **aprobación final** (juez).

**4. CERRAR.** Actualizar `docs/` (FUNCIONALIDADES + lo que toque) + memoria + commit/deploy. Así no se duplica
   ni se pierde nada la próxima vez.

> **Tus términos → tus skills YA instaladas (nada que crear):**
> `/spec` = `brainstorming` · `/build` = `writing-plans`→`executing-plans`/`subagent-driven-development`+`test-driven-development` ·
> `/revisar` = `verification-before-completion`+`requesting-code-review`+`systematic-debugging`.
> Cuando lo pedís con el gatillo, yo las encadeno solas; vos solo pedís y aprobás. **No hay que inventar nada.**

---

## 🔍 LOOP DE AUDITORÍA  (gatillo: «loop de auditoria» al inicio del mensaje)

**A. Auditar (solo lectura).** Correr `auditoria-tecnica` con contexto FlyClean (stack Notion, quirks, hallazgos
previos) → reporte calificado (nota A–F) + hallazgos numerados, de lo peor a lo más leve.

**B. Profundidad (para "la mejor cada vez").** Pasada en paralelo por dimensión (estructura, seguridad, datos,
etc.) + **verificación adversaria de cada hallazgo** (descartar falsos positivos, confirmar los reales).

**C. Decidís + arreglás.** Diego elige qué hallazgos ejecutar → cada arreglo entra al **Loop de Construcción**.

---

## 🗝️ Las 3 reglas que hacen que funcione
1. **El SPEC manda** — sobre todo el "hecho verificable". Sin eso, el loop no sabe cuándo terminó.
2. **Diego es el juez final** — yo verifico (Playwright/tests + pasada adversaria), vos aprobás.
3. **`docs/` = fuente de verdad** — consultar ANTES de construir (anti-redundancia).

## 🧰 Las skills que YA tenés (no hay que crear nada)
Inventario hecho 2026-06-26: las piezas de ambos loops ya están instaladas a nivel usuario (`~/.claude/skills/`).
**NO se crean skills nuevas** — sería duplicar (regla anti-redundancia).
- **Construcción:** `brainstorming` · `writing-plans` · `executing-plans` · `subagent-driven-development` ·
  `test-driven-development` · `verification-before-completion` · `requesting-code-review` · `receiving-code-review` ·
  `systematic-debugging`. (Bonus: `finishing-a-development-branch`, `using-git-worktrees`, `skill-creator`.)
- **Auditoría:** `auditoria-tecnica`.
- Único hueco real (sin hacer, por decisión de Diego): un wrapper `auditar-todo` que audite VARIOS proyectos
  de una pasada. Hoy se audita de a un proyecto con `auditoria-tecnica`.

## 📋 Replicar en El Parrillero (Next.js + Supabase + Vercel)
- Las skills (`brainstorming`, `auditoria-tecnica`) son a nivel usuario → ya sirven ahí.
- Abrir el **workspace de El Parrillero** (no FlyClean) → crear su `docs/` + `docs/specs/` → correr el MISMO método.
- Único cambio: el **Paso 3 (verificar)** usa **tests/CI** (Next.js+Supabase) en vez de Playwright sobre la app.
- El objetivo de El Parrillero ("replicable por configuración") = un spec cuyo "hecho verificable" sea justamente
  "se clona a otro restaurante cambiando solo configuración".
