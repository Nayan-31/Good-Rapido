# Good Rapido Frontend

This folder contains the frontend skeleton for Good Rapido.

No UI implementation code has been added yet. Use this structure as the starting point before building screens, components, state management, and backend API integration.

## Source Of Truth

- `FRONTEND_FLOW.md`: product flow, screens, and user journeys.
- `UI_DESIGN_DIRECTION.md`: final visual direction based on the approved references.

## Structure

```text
frontend/
  apps/
    rider-app/
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
  packages/
    api-client/
    config/
    ui/
```

## Build Order

1. Finalize frontend stack and package setup.
2. Create shared design tokens and base layout.
3. Build rider app screen routes.
4. Connect backend modules through the API client.
5. Add state management, validation, loading states, and error states.
