# Canonical Monorepo Documentation

This repository unifies Horeca Smart application layers under a strict monorepo architecture.

## Architecture

1. **Shared Core (`@horeca-smart/core`)**:
   - Single source of truth for RPC parameters, normalization, validation, metric calculations, and AI routing.
   - Zero UI framework dependencies.

2. **Studio (`apps/studio`)**:
   - Production client for Google AI Studio environment.
   - Server-side proxy for API key protection and static asset serving on port 3000.

3. **Lovable (`apps/lovable`)**:
   - Component-driven client with Radix UI and Tailwind styling.

4. **Database & Contracts (`supabase/`)**:
   - Versioned migrations preserving all business logic and dynamic freshness defaults.
