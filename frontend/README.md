# TypeScript Setup

TypeScript is configured from `frontend/tsconfig.base.json`.

The rider app uses:

```text
frontend/apps/rider-app/tsconfig.json
frontend/apps/rider-app/tsconfig.app.json
frontend/apps/rider-app/tsconfig.node.json
frontend/apps/rider-app/src/vite-env.d.ts
```

The shared UI package uses:

```text
frontend/packages/ui/tsconfig.json
frontend/packages/ui/src/types/css-modules.d.ts
```

Important setup choices:

```text
target: ES2022
module: ESNext
moduleResolution: Bundler
jsx: react-jsx
strict: true
noEmit: true
```

The rider app TypeScript config explicitly sets:

```json
"types": ["vite/client", "react", "react-dom"]
```

This keeps TypeScript from scanning unnecessary global type folders.

The rider app supports `@/*` imports through:

```json
"paths": {
  "@/*": ["src/*"]
}
```

The same alias is also configured in:

```text
frontend/apps/rider-app/vite.config.ts
```

Type checking runs with:

```text
npm --prefix frontend run typecheck:rider
```
