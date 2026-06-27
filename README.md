# 📦 Étiquettes de déménagement — Niimbot

Petite app web pour générer et imprimer des étiquettes de cartons de déménagement
sur une imprimante **Niimbot**, basée sur la librairie de communication de
[niimblue](https://github.com/MultiMote/niimblue) (`@mmote/niimbluelib`).

Tu choisis la **pièce** (Cuisine, Salle de bain, Chambre…) et le **numéro de carton**,
l'app génère un **QR code** (qui contient « Pièce | Carton N »), affiche un aperçu de
l'étiquette, et tu cliques sur **Imprimer**.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre ensuite http://localhost:5173 dans **Chrome** ou **Edge**.

## Utilisation

1. Allume l'imprimante Niimbot.
2. Clique sur **« Connecter l'imprimante »** → choisis-la dans la liste Bluetooth.
3. Renseigne la pièce et le numéro de carton (l'aperçu se met à jour en direct).
4. Choisis la quantité et la taille d'étiquette.
5. Clique sur **« Imprimer »**.

## Important — Bluetooth

L'API Web Bluetooth ne fonctionne que :

- sur **Chrome / Edge** (pas Firefox/Safari) ;
- sur une page servie en **https** ou sur **localhost**.

Donc `npm run dev` (localhost) fonctionne. Pour héberger l'app ailleurs, il faut du **https**.

## Build de production

```bash
npm run build      # génère le dossier dist/
npm run preview    # sert le build localement
```

Le dossier `dist/` est une app statique : tu peux la déposer sur n'importe quel
hébergement **https** (Netlify, Vercel, GitHub Pages, etc.).

## Personnalisation

- **Liste des pièces** : `src/labels.ts` → tableau `ROOMS`.
- **Tailles d'étiquettes** : `src/labels.ts` → `LABEL_SIZES`.
- **Mise en page de l'étiquette** (texte/QR) : `src/render.ts`.
- **Logique d'impression** : `src/printer.ts`.
