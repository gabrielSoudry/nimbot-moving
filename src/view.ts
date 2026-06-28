import "./view.css";
import { getBox } from "./api";

const root = document.getElementById("view") as HTMLDivElement;

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }) as Record<string, string>
      )[c],
  );
}

async function main() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    root.innerHTML = `<div class="msg">Aucun carton spécifié.</div>`;
    return;
  }
  root.innerHTML = `<div class="msg">Chargement…</div>`;
  try {
    const box = await getBox(id);
    const carton = box.boxNumber
      ? `Carton N°${escapeHtml(box.boxNumber)}`
      : "Carton";
    root.innerHTML = `
      <div class="detail">
        <div class="head">
          <div class="room">${escapeHtml(box.room || "Pièce")}</div>
          <div class="carton">${carton}</div>
        </div>
        ${
          box.photo
            ? `<img class="photo" src="${box.photo}" alt="Photo du carton" />`
            : `<div class="no-photo">Pas de photo pour ce carton</div>`
        }
      </div>
    `;
  } catch (e) {
    const status = (e as Error).message.includes("404")
      ? "Ce carton n'existe pas (ou a été supprimé)."
      : "Erreur de chargement : " + (e as Error).message;
    root.innerHTML = `<div class="msg err">${escapeHtml(status)}</div>`;
  }
}

main();
