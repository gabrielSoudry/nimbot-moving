// Liste des pieces proposees par defaut (l'utilisateur peut aussi saisir librement)
export const ROOMS: string[] = [
  "Cuisine",
  "Salon",
  "Salle à manger",
  "Chambre",
  "Vetement Anael",
  "Vetement Gabriel",
  "Vetement avital",
  "Chambre enfant",
  "Salle de bain",
  "Bureau",
  "Dressing",
  "Buanderie",
  "Cave",
  "Terrasse / Jardin",
  "Divers",
];

// Tailles d'etiquettes courantes (largeur x hauteur en mm). 8 px/mm = 203 dpi.
export type LabelSize = {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
};

export const LABEL_SIZES: LabelSize[] = [
  { id: "40x30", label: "40 × 30 mm", widthMm: 40, heightMm: 30 },
  { id: "50x30", label: "50 × 30 mm", widthMm: 50, heightMm: 30 },
  { id: "40x20", label: "40 × 20 mm", widthMm: 40, heightMm: 20 },
  { id: "30x15", label: "30 × 15 mm", widthMm: 30, heightMm: 15 },
];

export const DPMM = 8; // dots par millimetre (203 dpi)
