# Horeca Smart Canonical Monorepo

Canonical monorepo structure containing Horeca Smart analytics engine, AI services, and web applications.

## Workspaces & Structure

- `packages/core`: Core analytics engine, business rules, filter utilities, domain contracts, and AI services.
- `apps/studio`: AI Studio web application with Express backend and Vite frontend.
- `apps/lovable`: Lovable web application with TanStack router and Radix UI components.
- `supabase`: Database migrations and contract tests.
- `tests`: Cross-cutting contract tests, parity tests, and business-rules verification.

## Development & Build

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type checking
npm run lint

# Build all packages & apps
npm run build
```
