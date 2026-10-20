# Master Break — image de production.
#
# Construire sur le VPS ne marchait plus : `next build` demande environ un
# gigaoctet et demi, et la machine héberge déjà Supabase, le serveur média et
# l'application. Le noyau tuait la compilation au bout de quelques minutes.
#
# L'image se fabrique donc ailleurs — GitHub Actions — et le VPS ne fait plus
# que la démarrer. Au passage le déploiement tombe de vingt minutes à
# quelques secondes.

# ─────────────────────────────────────────────────────────── dépendances
FROM node:22-alpine AS deps
WORKDIR /app
# `.npmrc` d'abord : il pose `omit=peer`, qui écarte le better-sqlite3
# optionnel de drizzle-orm — sans quoi il faudrait Python et node-gyp.
COPY .npmrc package.json package-lock.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────── construction
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ce qui doit exister *à la construction*, pas seulement à l'exécution :
# `SUPABASE_URL` autorise le domaine des images dans next.config.ts, et les
# `NEXT_PUBLIC_*` sont recopiées dans le JavaScript envoyé au navigateur.
ARG SUPABASE_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG NEXT_PUBLIC_FIREBASE_VAPID_KEY
ENV SUPABASE_URL=$SUPABASE_URL \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_FIREBASE_SENDER_ID=$NEXT_PUBLIC_FIREBASE_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID \
    NEXT_PUBLIC_FIREBASE_VAPID_KEY=$NEXT_PUBLIC_FIREBASE_VAPID_KEY \
    NEXT_TELEMETRY_DISABLED=1

# Une adresse de base factice, uniquement pour la construction : certaines
# routes lisent `DATABASE_URL` au chargement de leur module et refusent de se
# charger sans elle. Rien ne se connecte ici — la vraie adresse est fournie
# au démarrage du conteneur.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"

RUN npm run build

# ─────────────────────────────────────────────────────────── exécution
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

# Ne pas tourner en root : une application qui sert du téléversement n'a
# aucune raison d'avoir les droits d'écriture sur son propre code.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Les migrations sont lues sur le disque au démarrage, par `instrumentation.ts`.
# Le traceur de Next les emporte aujourd'hui dans `standalone/db/migrations`,
# mais il le fait de son propre chef et rien ne l'y oblige : sans elles
# l'application démarrerait sur une base vide, en silence. On les copie donc
# explicitement — c'est la même chose, écrite noir sur blanc.
COPY --from=builder --chown=nextjs:nodejs /app/db/migrations ./db/migrations

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
