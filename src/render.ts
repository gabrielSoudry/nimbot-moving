import QRCode from "qrcode";
import { DPMM, type LabelSize } from "./labels";

export type LabelData = {
  room: string;
  boxNumber: string;
  size: LabelSize;
};

// Contenu encode dans le QR code : lisible par un humain ET parsable.
export function qrPayload(data: LabelData): string {
  const carton = data.boxNumber ? `Carton ${data.boxNumber}` : "Carton";
  return `${data.room} | ${carton}`;
}

// Helper : ajuste la taille de police pour qu'un texte tienne dans maxWidth.
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
  while (px > 8 && ctx.measureText(text).width > maxWidth) {
    px -= 1;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

// Dessine l'etiquette sur un canvas a la resolution de l'imprimante.
// Layout horizontal : QR a gauche, texte a droite.
export async function renderLabel(
  canvas: HTMLCanvasElement,
  data: LabelData,
): Promise<void> {
  const w = Math.round(data.size.widthMm * DPMM);
  const h = Math.round(data.size.heightMm * DPMM);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponible");

  // Fond blanc
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000000";

  const pad = Math.round(h * 0.06);

  // --- QR code (carre, cale a gauche) ---
  const qrSize = h - pad * 2;
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, qrPayload(data), {
    width: qrSize,
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  ctx.drawImage(qrCanvas, pad, pad, qrSize, qrSize);

  // --- Zone texte (a droite du QR) ---
  const textX = pad * 2 + qrSize;
  const textW = w - textX - pad;

  // Nom de la piece (gros, en haut)
  const room = data.room || "Pièce";
  const roomPx = fitFont(ctx, room.toUpperCase(), textW, Math.round(h * 0.42));
  ctx.font = `bold ${roomPx}px Arial, sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(room.toUpperCase(), textX, pad);

  // Numero de carton (en dessous)
  const carton = data.boxNumber ? `Carton N°${data.boxNumber}` : "Carton N°—";
  const cartonPx = fitFont(
    ctx,
    carton,
    textW,
    Math.round(h * 0.3),
    "bold",
  );
  ctx.font = `bold ${cartonPx}px Arial, sans-serif`;
  ctx.fillText(carton, textX, pad + roomPx + Math.round(h * 0.08));

  // Cadre fin autour de l'etiquette
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.max(1, Math.round(h * 0.012));
  ctx.strokeRect(0, 0, w, h);
}
