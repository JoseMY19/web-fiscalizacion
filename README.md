# Fiscalización Oficina

Office administration panel for the PAS (Procedimiento Administrativo
Sancionador) system, Municipalidad de San Juan de Lurigancho. Used by
validators, instructors and resolvers to process cases synced from the field
application through validation, instruction, resolution and appeals.

## Tech stack

- **React** + **Vite** + **TypeScript**
- **React Router** — one URL per module, browser back/forward and reload work correctly
- **socket.io-client** — live badge counts and bandeja updates, no manual refresh needed
- Plain CSS with design tokens (no UI framework dependency)

## Modules

- `auth` — office login and session context
- `dashboard` — main landing panel
- `documentos` — document control (mock data; the backend module for this
  was intentionally left out of this phase's scope)
- `expedientes` — pending-validation bandeja, approve/observe, full 360° case detail
- `consulta-campo` — read-only view of interventions closed in the field
  (Exhortación/Constatación) that never generate an Expediente
- `notificaciones` — home-delivery notification assignment and tracking
- `ifi` — final instruction report management
- `resoluciones` — sanctioning resolution management
- `recursos` — reconsideration and appeal management
- `coactiva-pagos` — final decision and manual payment registration
- `cautelares` — precautionary measures
- `configuracion` — deadline engine, CUIS catalog and UIT parameters

## Getting started

```bash
npm install
npm run dev
```

The app expects the backend API at `http://localhost:3000` by default (see
`src/api/client.ts`).

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
