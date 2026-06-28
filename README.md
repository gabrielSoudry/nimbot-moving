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

- Frontend statique **Vite + TypeScript** (`index.html` = app, `view.html` = page photo).
- Backend **Cloudflare Pages Functions** dans `functions/api/boxes/` :
  - `GET  /api/boxes` — liste (métadonnées, sans photos)
  - `POST /api/boxes` — créer / mettre à jour un carton
  - `GET  /api/boxes/:id` — un carton + sa photo
  - `DELETE /api/boxes/:id` — supprimer
- Stockage **Cloudflare KV** (binding `BOXES`) : `box:<id>` = métadonnées, `photo:<id>` = JPEG base64.

## Développement

UI seule (sans sauvegarde, pour ajuster l'étiquette) :

```bash
npm install
npm run dev          # http://localhost:5173  (Chrome / Edge)
```

App complète avec API + KV local (sauvegarde, liste, photo, page /view) :

```bash
npm run cf:dev       # build + wrangler pages dev (KV local automatique)
```

## Déploiement Cloudflare Pages

1. Connexion : `npx wrangler login`
2. Crée le namespace KV :
   ```bash
   npx wrangler kv namespace create BOXES
   ```
   Copie l'`id` renvoyé dans **`wrangler.toml`** (remplace `TON_KV_ID`).
3. Déploie :
   ```bash
   npm run cf:deploy
   ```
   (au premier déploiement, wrangler crée le projet Pages).

> Alternative dashboard : connecte le repo Git sur Cloudflare Pages,
> build command `npm run build`, output `dist`, puis lie le namespace KV
> sous **Settings → Functions → KV namespace bindings** (variable `BOXES`).

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
- API / KV : `functions/api/boxes/`.
