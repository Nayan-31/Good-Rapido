# Good Rapido Frontend

This folder contains the frontend workspace for Good Rapido.

The rider app is set up with React, Vite, and TypeScript. Screen implementation has not started yet. The shared UI package contains design-system primitives based on `UI_DESIGN_DIRECTION.md`.

## Source Of Truth

- `FRONTEND_FLOW.md`: product flow, screens, and user journeys.
- `UI_DESIGN_DIRECTION.md`: final visual direction based on the approved references.

## Structure

```text
frontend/
  apps/
    rider-app/
      index.html
      package.json
      public/
        assets/
        icons/
        images/
      src/
        app/
        assets/
        components/
        config/
        constants/
        features/
        hooks/
        layouts/
        lib/
        routes/
        services/
        store/
        styles/
        types/
        utils/
      tsconfig.app.json
      tsconfig.json
      tsconfig.node.json
      vite.config.ts
  packages/
    api-client/
    config/
    ui/
      src/
        components/
        styles/
        tokens/
        types/
```

## Commands

Install frontend dependencies from this folder:

```text
cd frontend
npm install
```

Run the rider app:

```text
npm run dev:rider
```

Type-check the rider app:

```text
npm run typecheck:rider
```

## Build Order

1. Create base app shell and route placeholders.
2. Define API client contracts for backend modules.
3. Build rider app screen routes.
4. Connect route screens to backend services.
5. Add state management, validation, loading states, and error states.
