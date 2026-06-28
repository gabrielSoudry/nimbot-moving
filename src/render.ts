import QRCode from "qrcode";
import { DPMM, type LabelSize } from "./labels";

export type Orientation = "horizontal" | "vertical";

// Marge de securite (mm) retiree dans le sens de l'avance papier a l'impression,
// pour ne pas deborder sur l'etiquette suivante (le gap entre etiquettes fait que
// la zone imprimable est un peu plus courte que la cote nominale).
// Augmente cette valeur si ca depasse encore, mets 0 si tu n'en veux pas.
export const FEED_SAFETY_MM = 6;

// Taille du QR par rapport a la largeur disponible (1 = pleine largeur).
// Baisse pour un QR plus petit, monte (max 1) pour plus grand.
export const QR_SCALE = 0.6;

export type LabelData = {
  room: string;
  boxNumber: string;
  size: LabelSize;
  orientation: Orientation;
  /** Contenu encode dans le QR (URL vers la page photo, ou texte). */
  qrData: string;
};

// Ajuste la taille de police pour qu'un texte tienne dans maxWidth.
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  weight = "bold",
  family = "Arial, sans-serif",
): number {
  let px = Math.max(7, Math.round(startPx));
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 7 && ctx.measureText(text).width > maxWidth) {
    px -= 1;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

async function makeQrCanvas(
  data: string,
  size: number,
): Promise<HTMLCanvasElement> {
  const c = document.createElement("canvas");
  await QRCode.toCanvas(c, data || " ", {
    width: Math.max(40, Math.round(size)),
    margin: 2, // zone de silence : evite que les coins/motifs soient rognes
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  return c;
}

// Dessine la composition (QR + texte) dans un repere logique lw x lh.
// La composition remplit toute la surface (pas de marges blanches inutiles).
function drawComposition(
  ctx: CanvasRenderingContext2D,
  lw: number,
  lh: number,
  orientation: Orientation,
  data: LabelData,
  qr: HTMLCanvasElement,
  qrSize: number,
  pad: number,
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  const room = (data.room || "Pièce").toUpperCase();
  const carton = data.boxNumber ? `Carton N°${data.boxNumber}` : "Carton N°—";

  if (orientation === "vertical") {
    // Portrait : QR en haut avec une marge egale haut/gauche/droite,
    // texte en dessous, le tout reparti pour occuper la hauteur restante.
    const sideMargin = (lw - qrSize) / 2; // marge gauche/droite
    const qrY = sideMargin; // meme marge en haut
    ctx.drawImage(qr, sideMargin, qrY, qrSize, qrSize);

    ctx.textAlign = "center";
    const cx = lw / 2;
    const top = qrY + qrSize + Math.round(lh * 0.03);
    const avail = lh - pad - top;
    const textW = lw - pad * 2;

    const roomPx = fitFont(ctx, room, textW, avail * 0.52);
    const gap = Math.round(avail * 0.06);
    const cartonPx = fitFont(ctx, carton, textW, avail * 0.34, "bold");

    const blockH = roomPx + gap + cartonPx;
    let y = top + Math.max(0, (avail - blockH) / 2);

    ctx.font = `bold ${roomPx}px Arial, sans-serif`;
    ctx.fillText(room, cx, y);
    y += roomPx + gap;
    ctx.font = `bold ${cartonPx}px Arial, sans-serif`;
    ctx.fillText(carton, cx, y);
  } else {
    // Paysage : QR a gauche (centre verticalement), texte a droite.
    ctx.drawImage(qr, pad, (lh - qrSize) / 2, qrSize, qrSize);

    ctx.textAlign = "left";
    const textX = pad * 2 + qrSize;
    const textW = lw - textX - pad;
    const avail = lh - pad * 2;

    const roomPx = fitFont(ctx, room, textW, avail * 0.5);
    const gap = Math.round(avail * 0.08);
    const cartonPx = fitFont(ctx, carton, textW, avail * 0.34);

    const blockH = roomPx + gap + cartonPx;
    let y = pad + Math.max(0, (avail - blockH) / 2);

    ctx.font = `bold ${roomPx}px Arial, sans-serif`;
    ctx.fillText(room, textX, y);
    y += roomPx + gap;
    ctx.font = `bold ${cartonPx}px Arial, sans-serif`;
    ctx.fillText(carton, textX, y);
  }

  ctx.textAlign = "left";
}

/**
 * Rend l'etiquette sur un canvas.
 * @param forPrint  En mode vertical : false = apercu portrait a l'endroit ;
 *                  true = canvas a la geometrie imprimante (meme raster que
 *                  l'horizontal) avec le contenu pivote de 90°.
 */
export async function renderLabel(
  canvas: HTMLCanvasElement,
  data: LabelData,
  forPrint = false,
): Promise<void> {
  // w = sens de l'avance papier (rows a l'impression) ; on le raccourcit
  // legerement a l'impression pour tenir sur une seule etiquette.
  // h = largeur sur la tete d'impression (cols) : inchangee pour remplir.
  const feedMm = data.size.widthMm - (forPrint ? FEED_SAFETY_MM : 0);
  const w = Math.round(feedMm * DPMM);
  const h = Math.round(data.size.heightMm * DPMM);
  const vertical = data.orientation === "vertical";

  // Dimensions logiques de la composition.
  const lw = vertical ? h : w; // largeur logique
  const lh = vertical ? w : h; // hauteur logique

  // Dimensions physiques du canvas + rotation eventuelle.
  let cw: number, ch: number, rotate: boolean;
  if (vertical && forPrint) {
    cw = w;
    ch = h;
    rotate = true; // on pivote la composition portrait dans le raster w x h
  } else {
    cw = lw;
    ch = lh;
    rotate = false;
  }

  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponible");

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);

  if (rotate) {
    ctx.translate(cw, 0);
    ctx.rotate(Math.PI / 2);
  }

  // Marge minimale = zone de silence du QR (necessaire pour le scan).
  // QR pleine largeur (vertical) ou pleine hauteur (horizontal).
  const pad = Math.round(Math.min(lw, lh) * 0.025);
  const qrSize = Math.round((vertical ? lw - pad * 2 : lh - pad * 2) * QR_SCALE);
  const qr = await makeQrCanvas(data.qrData, qrSize);

  drawComposition(ctx, lw, lh, data.orientation, data, qr, qrSize, pad);
}
