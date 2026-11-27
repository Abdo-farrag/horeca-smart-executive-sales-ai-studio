# Replit-independent full-stack deployment. Use a separate server/container; no Odoo changes.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY apps/lovable/package.json apps/lovable/package.json
COPY apps/studio/package.json apps/studio/package.json
RUN npm ci
COPY . .
# Only public Supabase client settings belong in build-time Vite variables.
# NEVER put a Supabase service-role key or Gemini API key in a VITE_ variable.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_RETURNS_REVIEW_CENTER_ENABLED=false
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_RETURNS_REVIEW_CENTER_ENABLED=${VITE_RETURNS_REVIEW_CENTER_ENABLED}
RUN npm run build && test -f dist/index.html && test -f dist/server.cjs

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/packages ./packages
COPY --from=build --chown=node:node /app/apps ./apps
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.cjs"]
