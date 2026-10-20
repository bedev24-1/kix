# Redéployer Master Break sur Coolify

Rien à lancer après le déploiement : `instrumentation.ts` applique les
migrations au démarrage, et ne charge le jeu de démonstration que si la base
est vide — `MB_SKIP_SEED=1` l'interdit de toute façon en production.

## 1. La ressource

- **Type** : Application → Public/Private Repository (Nixpacks).
- **Dépôt** : `end2-237/kix`, branche `main`.
- **Build** : `npm run build` · **Start** : `npm run start` · **Port** : `3000`.
- **Health check** : `/connexion` (toujours servie, même base vide).

Aucune dépendance native à compiler : le `.npmrc` du dépôt pose `omit=peer`
pour écarter le `better-sqlite3` optionnel de drizzle-orm, qui exigerait
Python et node-gyp dans l'image de build.

## 2. Les variables, avant de construire

Trois d'entre elles se figent **dans le build** et ne servent à rien si on les
pose après : `SUPABASE_URL` (c'est elle qui autorise le domaine des images
dans `next.config.ts`) et toutes celles préfixées `NEXT_PUBLIC_`, qui sont
recopiées dans le JavaScript envoyé au navigateur. Les poser sur la ressource
**avant** de lancer le premier déploiement, et **reconstruire** après chaque
changement de l'une d'elles — un simple redémarrage ne suffit pas.

| Variable | Obligatoire | Où la trouver |
| --- | --- | --- |
| `DATABASE_URL` | oui | Supabase auto-hébergé. Depuis le même réseau Docker : `postgresql://postgres:MDP@db:5432/postgres?options=-c%20search_path%3Dmb%2Cpublic`. Le `search_path` n'est pas décoratif : tout vit dans le schéma `mb`. |
| `MB_SKIP_SEED` | oui | `1`. Sans lui, une base vide se remplit de salles et de comptes fictifs. |
| `MB_PUBLIC_URL` | oui | `https://mb.vps.buyticle.com` — sert aux liens sortants et au partage. |
| `MB_QR_SECRET` | oui | N'importe quel secret long et stable. Absent, une clé est tirée au démarrage et **tous les Master Pass cessent de fonctionner à chaque redéploiement**. `openssl rand -base64 48`. |
| `DATABASE_POOL` | non | `10` par défaut. |
| `MB_ADMIN_PHONE` | non | Le numéro qui passe administrateur au prochain démarrage. Utile une fois, après la première inscription. |

### Paiements — pawaPay

| Variable | Valeur |
| --- | --- |
| `PAWAPAY_API_TOKEN` | le jeton du tableau de bord pawaPay. **Absent, l'encaisseur de démonstration prend la main** : même parcours, aucun argent. |
| `PAWAPAY_ENV` | `production` (ou `sandbox`) |
| `PAWAPAY_CURRENCY` | `XAF` |
| `PAWAPAY_DIAL_CODE` | `237` |
| `PAWAPAY_PROVIDER_OM` | `ORANGE_CMR` |
| `PAWAPAY_PROVIDER_MOMO` | `MTN_MOMO_CMR` |

### Images des fiches — Supabase Storage

| Variable | Valeur |
| --- | --- |
| `SUPABASE_URL` | l'URL du Supabase auto-hébergé, **au build** |
| `SUPABASE_SERVICE_ROLE_KEY` | la clé `service_role`, **pas** la clé `anon`. Studio → Settings → API. Une clé `anon` laisse les téléversements échouer en silence. |
| `SUPABASE_BUCKET` | `mb-public` (défaut) |

### Notifications

Deux chemins, cumulables. La paire VAPID suffit à elle seule sur Android et
sur le web ; Firebase s'ajoute pour iOS et pour le canal FCM.

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 87 caractères, commence par `B` |
| `VAPID_PRIVATE_KEY` | 43 caractères — **jamais** de préfixe `NEXT_PUBLIC_` |
| `VAPID_SUBJECT` | `mailto:contact@masterbreak.cm` |

`npm run push:cles` génère une paire valide. Dans la console Firebase, la
« paire de clés » de Cloud Messaging → Web Push est utilisable telle quelle :
la clé publique va dans `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, la privée dans
`VAPID_PRIVATE_KEY`.

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | la clé web du projet (publique par nature) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` · `_APP_ID` · `_SENDER_ID` · `_MEASUREMENT_ID` | console Firebase → Paramètres du projet → Vos applications |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | la clé publique Web Push, même valeur que ci-dessus |
| `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` | recopiés du `.json` du compte de service |
| `FIREBASE_SERVICE_ACCOUNT` | *ou* le `.json` entier, collé tel quel ou en base64 |

Le compte de service est un vrai secret : jamais de préfixe `NEXT_PUBLIC_`.

### Master Break Live — MediaMTX

| Variable | Valeur |
| --- | --- |
| `MB_MEDIA_URL` | `https://media.…` — HLS, proxy vers le port 8888 |
| `MB_MEDIA_WHIP` | `https://whip.…` — WebRTC, proxy vers le port 8889 |
| `MB_MEDIA_RTMP` | `rtmp://media.…:1935` — ingestion OBS |
| `MB_MEDIA_HOOK_SECRET` | le même secret que dans `deploy/mediamtx.yml` |

Deux sous-domaines, parce que HLS et WebRTC sont deux serveurs distincts qu'un
même domaine ne peut pas départager.

## 3. Déployer

1. Coller les variables, **Save**.
2. **Redeploy** — en cochant *Force rebuild* si une `NEXT_PUBLIC_*` ou
   `SUPABASE_URL` a changé.
3. Suivre les logs. Au démarrage, on doit lire les migrations appliquées. Si
   `aucune migration trouvée` apparaît, `db/migrations` n'est pas dans l'image.

## 4. Vérifier, dans cet ordre

| Vérification | Où |
| --- | --- |
| l'app répond | `/connexion` |
| la base est branchée | se connecter ; une page de salles non vide |
| le stockage marche | gérant → modifier une salle → téléverser une photo |
| les notifications partent | `/app/notifications` → activer, puis `/api/push/test` |
| les paiements | une recharge de jetons : l'écran d'attente doit mener à un vrai USSD |
| les directs | `/direct` → une vignette, et le lecteur qui démarre |

## 5. Quand ça casse

- **Les Master Pass ne marchent plus après un déploiement** → `MB_QR_SECRET`
  n'est pas posé.
- **Les photos téléversées ne s'affichent pas** → `SUPABASE_URL` posée après
  le build : reconstruire.
- **Les téléversements échouent** → c'est une clé `anon` qui est dans
  `SUPABASE_SERVICE_ROLE_KEY`.
- **« Notifications activées » mais rien n'arrive** → `VAPID_PRIVATE_KEY`
  manque : le navigateur s'abonne, et plus rien ne peut signer l'envoi.
- **Un direct reste « en cours » caméra débranchée** → MediaMTX ne joint pas
  `/api/media/event` : vérifier `MB_MEDIA_HOOK_SECRET` des deux côtés.
- **Un paiement se confirme tout seul en 4 secondes** → `PAWAPAY_API_TOKEN`
  est absent, l'encaisseur de démonstration a pris la main.

Les ports de MediaMTX de la salle (1935, 8888, 8889) ne doivent **jamais** être
ouverts sur la box de la salle : ce serveur-là n'a pas d'authentification, par
construction.
