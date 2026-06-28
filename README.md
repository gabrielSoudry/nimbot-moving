# 📦 Étiquettes de déménagement — Niimbot + Cloudflare

App web pour générer/imprimer des étiquettes QR de cartons sur imprimante **Niimbot**,
avec **sauvegarde dans Cloudflare KV** et **photo du contenu** consultable en scannant le QR.

Basée sur la lib de communication de [niimblue](https://github.com/MultiMote/niimblue)
(`@mmote/niimbluelib`).

## Fonctionnalités

- Choix de la **pièce** (liste déroulante native + « Autre… » pour saisie libre).
- **N° de carton**, quantité, taille d'étiquette.
- **Photo** du contenu (compressée dans le navigateur).
- **QR code** → encode une URL `…/view?id=xxx`. En scannant, la page affiche la **photo
  en grand + le N° de carton + la pièce**.
- Bouton **Sauvegarder** → stocke le carton (métadonnées + photo) dans **Cloudflare KV**.
- **Liste des cartons sauvegardés**, avec lien « Voir » et bouton **Supprimer**.
- Bouton **Imprimer** (Bluetooth Niimbot).

## Architecture

App **Cloudflare Worker** (assets statiques + API) construite avec **Vite** et le
plugin `@cloudflare/vite-plugin`.

- Frontend **Vite + TypeScript** : `index.html` = app, `view.html` = page photo (scan QR).
- Backend = un seul **Worker** (`worker/index.ts`) :
  - `GET  /api/boxes` — liste (métadonnées, sans photos)
  - `POST /api/boxes` — créer / mettre à jour un carton
  - `GET  /api/boxes/:id` — un carton + sa photo
  - `DELETE /api/boxes/:id` — supprimer
  - tout le reste → assets statiques (binding `ASSETS`)
- Stockage **Cloudflare KV** (binding `BOXES`) : `box:<id>` = métadonnées, `photo:<id>` = JPEG base64.
- Config : **`wrangler.jsonc`** (projet `nimbot-moving`).

## Développement

Le plugin Vite fait tourner le Worker dans workerd **avec un KV local automatique** —
donc `npm run dev` te donne l'app complète (sauvegarde, liste, photo, /view) :

```bash
npm install
npm run dev          # http://localhost:5173  (Chrome / Edge)
npm run preview      # prévisualise le build dans workerd (proche prod)
```

## Déploiement (Cloudflare Workers)

Le namespace KV existe déjà (id renseigné dans `wrangler.jsonc`). Pour le recréer :
`npx wrangler kv namespace create BOXES` puis colle l'`id` dans `wrangler.jsonc`.

**Depuis ta machine :**
```bash
npx wrangler login
npm run deploy       # = vite build + wrangler deploy
```

**Via CI Git (Workers Builds) :** dans les build settings du projet :
- **Build command** : `npm run build`
- **Deploy command** : `npx wrangler deploy`

> `wrangler deploy` (commande Workers) lit la config redirigée générée par le plugin
> dans `dist/nimbot_moving/`, et applique le binding KV depuis `wrangler.jsonc`.
> Le token API du CI a juste besoin des permissions **Workers Scripts: Edit** +
> **Workers KV Storage: Edit** (plus besoin de permission *Pages*).

Une fois en ligne, l'app est servie en **https**, donc le Bluetooth fonctionne et les
QR codes pointent vers la bonne URL publique.

## Utilisation

1. Allume l'imprimante, clique **« Connecter l'imprimante »** (Chrome/Edge).
2. Choisis la pièce, le N° de carton, ajoute une photo si tu veux.
3. **Sauvegarder** (le QR pointe vers la photo).
4. **Imprimer**. **➕ Nouveau carton** réinitialise et incrémente le numéro.
5. Scanne le QR collé sur le carton → la photo + le numéro s'affichent.

## Bluetooth — rappel

Web Bluetooth = **Chrome / Edge** uniquement, sur **https** ou **localhost**.

## Personnalisation

- Pièces : `src/labels.ts` (`ROOMS`).
- Tailles d'étiquettes : `src/labels.ts` (`LABEL_SIZES`).
- Mise en page étiquette : `src/render.ts`.
- Page photo (scan) : `src/view.ts` / `src/view.css`.
- Impression : `src/printer.ts`.
- API / KV : `worker/index.ts`.
