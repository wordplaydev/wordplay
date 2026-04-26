# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run check         # TypeScript + Svelte type checking (watch mode)

# Building
npm run build         # Full production build

# Testing
npm test              # Run Vitest unit tests
npm run end2end       # Playwright e2e tests (requires Firebase emulator)

# Localization
npm run locales       # Verify locale files
npm run locales-fix   # Auto-fix locale issues
npm run schemas       # Derive schema for locale files from TypeScript
```

## Architecture

Wordplay is a web-based programming language IDE where creators write code that produces interactive, animated typography. It is built with Svelte 5 + SvelteKit 2, TypeScript (strict, no `any`), Firebase, and Vite.

### Core pipeline

Text input → **Parser** ([src/parser/](src/parser/)) → AST nodes ([src/nodes/](src/nodes/)) → **Compiler** (`Expression.compile()`) → `Step[]` → **Evaluator** ([src/runtime/Evaluator.ts](src/runtime/Evaluator.ts)) → `Value` → **Output renderer** ([src/components/output/](src/components/output/))

1. **Tokenizer** (`Tokenizer.ts`) segments text into `Token` nodes.
2. **Parser** (`parseProgram.ts`) builds an AST of ~170+ node types rooted at `Source`.
3. **AST nodes** ([src/nodes/](src/nodes/)) are **immutable** — all fields `readonly`. Nodes do not know their parent; `Root.ts` manages parent relationships. Nodes serve as the center of everything: structure, behavior, type checking, conflict detection, and localized descriptions.
4. **Type checking**: `Expression.computeType()` infers or checks types. `Context.ts` caches analysis state and prevents cycles.
5. **Conflict detection**: `Node.computeConflicts()` finds ~50+ error types ([src/conflicts/](src/conflicts/)). `Project.analyze()` runs analysis at the project level, spanning multiple `Source` files.
6. **Compilation**: `Expression.compile()` converts each expression into a flat list of `Step`s ([src/runtime/Step.ts](src/runtime/Step.ts)).
7. **Evaluation**: `Evaluator.ts` runs the `Step` sequence, maintaining a call stack and value stack. `StreamValue`s ([src/values/](src/values/)) trigger reevaluation on each new input event.
8. **Output**: `Stage`, `Phrase`, and `Group` structure values are rendered by Svelte components in [src/components/output/](src/components/output/).

### Key architectural files

| File                                                                                   | Purpose                                                          |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [src/nodes/Node.ts](src/nodes/Node.ts)                                                 | Base class for all AST nodes; grammar, children, lexical scope   |
| [src/nodes/Expression.ts](src/nodes/Expression.ts)                                     | Adds `computeType()`, `compile()`, evaluation descriptions       |
| [src/runtime/Evaluator.ts](src/runtime/Evaluator.ts)                                   | Runs compiled steps; manages call stack, streams, reevaluation   |
| [src/models/Project.ts](src/models/Project.ts)                                         | A named collection of `Source` files; entry point for analysis   |
| [src/db/Database.ts](src/db/Database.ts)                                               | All persistence (Firebase + localStorage); exposes Svelte stores |
| [src/runtime/createDefaultShares.ts](src/runtime/createDefaultShares.ts)               | Registers built-in APIs (output types, streams, basis functions) |
| [src/components/project/ProjectView.svelte](src/components/project/ProjectView.svelte) | Top-level window manager and global context store                |

### Localization

All user-visible strings live in locale JSON files ([static/locales/](static/locales/), 38+ languages) validated against a schema. `Database` exposes the active locale as a Svelte store. Nodes, conflicts, values, and APIs all define localized descriptions via `Locale.ts`. Run `npm run locales` to verify and `npm run locales-fix` to repair issues.

### Immutability convention

Immutable data structures and pure functions are the norm everywhere except: Svelte components (internal state + global context), `Evaluator` (stack-based evaluation state), and `Database` (persistence). Most bugs will be in those three areas.
