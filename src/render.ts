import QRCode from "qrcode";
import { DPMM, type LabelSize } from "./labels";

export type Orientation = "horizontal" | "vertical";

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
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 7 && ctx.measureText(text).width > maxWidth) {
    px -= 1;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

async function makeQrCanvas(data: string, size: number): Promise<HTMLCanvasElement> {
  const c = document.createElement("canvas");
  await QRCode.toCanvas(c, data || " ", {
    width: size,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  return c;
}

// Dessine la composition (QR + texte) dans un repere logique lw x lh.
function drawComposition(
  ctx: CanvasRenderingContext2D,
  lw: number,
  lh: number,
  orientation: Orientation,
  data: LabelData,
  qr: HTMLCanvasElement,
): void {
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  const room = (data.room || "Pièce").toUpperCase();
  const carton = data.boxNumber ? `Carton N°${data.boxNumber}` : "Carton N°—";

  if (orientation === "vertical") {
    // Portrait : QR en haut, texte dessous, centre.
    const pad = Math.round(lw * 0.08);
    const qrSize = Math.min(lw - pad * 2, Math.round(lh * 0.5));
    ctx.drawImage(qr, (lw - qrSize) / 2, pad, qrSize, qrSize);

    ctx.textAlign = "center";
    const cx = lw / 2;
    let y = pad + qrSize + Math.round(lh * 0.04);

    const roomPx = fitFont(ctx, room, lw - pad * 2, Math.round(lh * 0.16));
    ctx.font = `bold ${roomPx}px Arial, sans-serif`;
    ctx.fillText(room, cx, y);
    y += roomPx + Math.round(lh * 0.02);

    const cartonPx = fitFont(ctx, carton, lw - pad * 2, Math.round(lh * 0.12));
    ctx.font = `bold ${cartonPx}px Arial, sans-serif`;
    ctx.fillText(carton, cx, y);
  } else {
    // Paysage : QR a gauche, texte a droite.
    const pad = Math.round(lh * 0.06);
    const qrSize = lh - pad * 2;
    ctx.drawImage(qr, pad, pad, qrSize, qrSize);

    ctx.textAlign = "left";
    const textX = pad * 2 + qrSize;
    const textW = lw - textX - pad;

    const roomPx = fitFont(ctx, room, textW, Math.round(lh * 0.42));
    ctx.font = `bold ${roomPx}px Arial, sans-serif`;
    ctx.fillText(room, textX, pad);

    const cartonPx = fitFont(ctx, carton, textW, Math.round(lh * 0.3));
    ctx.font = `bold ${cartonPx}px Arial, sans-serif`;
    ctx.fillText(carton, textX, pad + roomPx + Math.round(lh * 0.08));
  }

  // Cadre fin
  ctx.textAlign = "left";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.max(1, Math.round(Math.min(lw, lh) * 0.02));
  ctx.strokeRect(0, 0, lw, lh);
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
  const w = Math.round(data.size.widthMm * DPMM);
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

  const qrSize = vertical
    ? Math.min(lw - Math.round(lw * 0.16), Math.round(lh * 0.5))
    : lh - Math.round(lh * 0.12);
  const qr = await makeQrCanvas(data.qrData, Math.max(40, Math.round(qrSize)));

  drawComposition(ctx, lw, lh, data.orientation, data, qr);
}
