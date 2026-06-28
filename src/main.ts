import "./style.css";
import { ROOMS, LABEL_SIZES } from "./labels";
import { renderLabel, type LabelData, type Orientation } from "./render";
import { connect, disconnect, isConnected, printCanvas } from "./printer";
import { compressImage } from "./photo";
import {
  shortId,
  listBoxes,
  saveBox,
  deleteBox,
  type BoxMeta,
} from "./api";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <header>
    <h1>📦 Étiquettes de déménagement</h1>
    <p>Choisis la pièce et le carton, ajoute une photo, sauvegarde et imprime le QR code sur ta Niimbot.</p>
  </header>

  <div class="layout">
    <section class="card">
      <h2>Étiquette</h2>

      <div class="field">
        <label for="room">Pièce</label>
        <select id="room">
          ${ROOMS.map((r) => `<option value="${r}">${r}</option>`).join("")}
          <option value="__other__">Autre…</option>
        </select>
        <input id="room-other" type="text" placeholder="Saisir une pièce" style="display:none;margin-top:8px" />
      </div>

      <div class="row">
        <div class="field">
          <label for="box">N° de carton</label>
          <input id="box" type="text" inputmode="numeric" placeholder="Ex. 12" />
        </div>
        <div class="field">
          <label for="qty">Quantité à imprimer</label>
          <input id="qty" type="number" min="1" value="1" />
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label for="size">Taille d'étiquette</label>
          <select id="size">
            ${LABEL_SIZES.map(
              (s, i) =>
                `<option value="${s.id}" ${i === 0 ? "selected" : ""}>${s.label}</option>`,
            ).join("")}
          </select>
        </div>
        <div class="field">
          <label for="orientation">Orientation</label>
          <select id="orientation">
            <option value="vertical" selected>Vertical</option>
            <option value="horizontal">Horizontal</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label for="desc">Description (stockée, pas sur l'étiquette)</label>
        <textarea id="desc" rows="2" maxlength="500" placeholder="Ex. Vaisselle fragile, à ouvrir en premier…"></textarea>
      </div>

      <div class="field">
        <label for="photo">Photo du contenu (optionnel)</label>
        <input id="photo" type="file" accept="image/*" capture="environment" />
        <div id="photo-preview" class="photo-preview" style="display:none">
          <img id="photo-img" alt="Aperçu photo" />
          <button id="photo-clear" class="btn-mini" type="button">Retirer la photo</button>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Aperçu &amp; impression</h2>
      <div class="preview-wrap">
        <canvas id="preview"></canvas>
      </div>

      <button id="save" class="btn-primary">💾 Sauvegarder</button>
      <div style="height:10px"></div>
      <button id="connect" class="btn-secondary">
        <span class="dot" id="dot"></span><span id="connect-label">Connecter l'imprimante</span>
      </button>
      <button id="print" class="btn-secondary" disabled>🖨️ Imprimer</button>
      <button id="new" class="btn-secondary" type="button">➕ Nouveau carton</button>

      <div class="status" id="status">Prêt.</div>

      <p class="warn">
        ⚠️ Le Bluetooth nécessite Chrome / Edge et une page en <code>https</code> ou
        <code>localhost</code>. Le QR code renvoie vers la photo du carton une fois sauvegardé.
      </p>
    </section>
  </div>

  <section class="card" style="margin-top:20px">
    <h2>Cartons sauvegardés</h2>
    <div id="list">Chargement…</div>
  </section>
`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const roomEl = $<HTMLSelectElement>("room");
const roomOtherEl = $<HTMLInputElement>("room-other");
const boxEl = $<HTMLInputElement>("box");
const qtyEl = $<HTMLInputElement>("qty");
const sizeEl = $<HTMLSelectElement>("size");
const orientationEl = $<HTMLSelectElement>("orientation");
const descEl = $<HTMLTextAreaElement>("desc");
const photoEl = $<HTMLInputElement>("photo");
const photoPreview = $<HTMLDivElement>("photo-preview");
const photoImg = $<HTMLImageElement>("photo-img");
const photoClear = $<HTMLButtonElement>("photo-clear");
const canvas = $<HTMLCanvasElement>("preview");
const saveBtn = $<HTMLButtonElement>("save");
const connectBtn = $<HTMLButtonElement>("connect");
const connectLabel = $<HTMLSpanElement>("connect-label");
const dot = $<HTMLSpanElement>("dot");
const printBtn = $<HTMLButtonElement>("print");
const newBtn = $<HTMLButtonElement>("new");
const statusEl = $<HTMLDivElement>("status");
const listEl = $<HTMLDivElement>("list");

// --- Etat du brouillon courant ---
let draftId = shortId();
let photoData: string | null = null; // data URL JPEG

function setStatus(msg: string, kind: "" | "ok" | "err" = "") {
  statusEl.textContent = msg;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

function currentRoom(): string {
  return roomEl.value === "__other__"
    ? roomOtherEl.value.trim()
    : roomEl.value.trim();
}

function qrUrl(): string {
  return `${location.origin}/view?id=${encodeURIComponent(draftId)}`;
}

function currentData(): LabelData {
  const size = LABEL_SIZES.find((s) => s.id === sizeEl.value) ?? LABEL_SIZES[0];
  return {
    room: currentRoom(),
    boxNumber: boxEl.value.trim(),
    size,
    orientation: orientationEl.value as Orientation,
    qrData: qrUrl(),
  };
}

let renderQueued = false;
function updatePreview() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(async () => {
    renderQueued = false;
    try {
      await renderLabel(canvas, currentData());
    } catch (e) {
      console.error(e);
    }
  });
}

// --- Pièce : champ libre via "Autre…" ---
roomEl.addEventListener("change", () => {
  roomOtherEl.style.display = roomEl.value === "__other__" ? "block" : "none";
  if (roomEl.value === "__other__") roomOtherEl.focus();
  updatePreview();
});
roomOtherEl.addEventListener("input", updatePreview);
[boxEl, sizeEl, orientationEl].forEach((el) =>
  el.addEventListener("input", updatePreview),
);

// --- Photo ---
photoEl.addEventListener("change", async () => {
  const file = photoEl.files?.[0];
  if (!file) return;
  setStatus("Compression de la photo…");
  try {
    photoData = await compressImage(file);
    photoImg.src = photoData;
    photoPreview.style.display = "block";
    setStatus("Photo prête. N'oublie pas de sauvegarder.", "ok");
  } catch (e) {
    setStatus("Photo illisible : " + (e as Error).message, "err");
  }
});
photoClear.addEventListener("click", () => {
  photoData = null;
  photoEl.value = "";
  photoPreview.style.display = "none";
});

// --- Connexion imprimante ---
function refreshConnectionUi() {
  const on = isConnected();
  dot.classList.toggle("on", on);
  connectLabel.textContent = on
    ? "Imprimante connectée — déconnecter"
    : "Connecter l'imprimante";
  printBtn.disabled = !on;
}

connectBtn.addEventListener("click", async () => {
  if (isConnected()) {
    await disconnect();
    refreshConnectionUi();
    setStatus("Imprimante déconnectée.");
    return;
  }
  connectBtn.disabled = true;
  setStatus("Connexion en cours…");
  try {
    await connect(() => {
      refreshConnectionUi();
      setStatus("Imprimante déconnectée.", "err");
    });
    refreshConnectionUi();
    setStatus("Imprimante connectée ✓", "ok");
  } catch (e) {
    setStatus("Échec de la connexion : " + (e as Error).message, "err");
  } finally {
    connectBtn.disabled = false;
  }
});

// --- Sauvegarde ---
saveBtn.addEventListener("click", async () => {
  const room = currentRoom();
  if (!room) {
    setStatus("Renseigne d'abord la pièce.", "err");
    return;
  }
  saveBtn.disabled = true;
  setStatus("Sauvegarde…");
  try {
    await saveBox({
      id: draftId,
      room,
      boxNumber: boxEl.value.trim(),
      description: descEl.value.trim(),
      photo: photoData,
    });
    setStatus("Carton sauvegardé ✓", "ok");
    await refreshList();
  } catch (e) {
    setStatus("Erreur de sauvegarde : " + (e as Error).message, "err");
  } finally {
    saveBtn.disabled = false;
  }
});

// --- Impression ---
printBtn.addEventListener("click", async () => {
  const data = currentData();
  if (!data.room) {
    setStatus("Renseigne d'abord la pièce.", "err");
    return;
  }
  const quantity = Math.max(1, parseInt(qtyEl.value, 10) || 1);
  printBtn.disabled = true;
  setStatus("Impression en cours…");
  try {
    // Canvas dedie a l'impression : geometrie imprimante (contenu pivote si vertical).
    const printCanvasEl = document.createElement("canvas");
    await renderLabel(printCanvasEl, data, true);
    await printCanvas(printCanvasEl, {
      quantity,
      onProgress: (page, total) => setStatus(`Impression ${page}/${total}…`),
    });
    setStatus(
      `Imprimé ✓ (${quantity} étiquette${quantity > 1 ? "s" : ""})`,
      "ok",
    );
  } catch (e) {
    setStatus("Erreur d'impression : " + (e as Error).message, "err");
  } finally {
    printBtn.disabled = !isConnected();
  }
});

// --- Nouveau carton ---
newBtn.addEventListener("click", () => {
  draftId = shortId();
  photoData = null;
  photoEl.value = "";
  descEl.value = "";
  photoPreview.style.display = "none";
  const next = parseInt(boxEl.value, 10);
  boxEl.value = Number.isFinite(next) ? String(next + 1) : "";
  setStatus("Nouveau carton.", "");
  updatePreview();
});

// --- Liste des cartons sauvegardes ---
function fmtDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString("fr-FR");
  } catch {
    return "";
  }
}

async function refreshList() {
  try {
    const boxes = await listBoxes();
    if (boxes.length === 0) {
      listEl.innerHTML = `<p class="muted">Aucun carton sauvegardé pour l'instant.</p>`;
      return;
    }
    listEl.innerHTML = boxes.map(renderRow).join("");
    boxes.forEach((b) => wireRow(b));
  } catch (e) {
    listEl.innerHTML = `<p class="status err">Impossible de charger la liste : ${
      (e as Error).message
    }<br><span class="muted">(l'API n'est dispo qu'en déploiement Cloudflare ou via <code>wrangler pages dev</code>)</span></p>`;
  }
}

function esc(s: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

function renderRow(b: BoxMeta): string {
  const carton = b.boxNumber ? `Carton N°${esc(b.boxNumber)}` : "Carton";
  return `
    <div class="box-row" data-id="${b.id}">
      <div class="box-info">
        <strong>${esc(b.room) || "Pièce"}</strong> — ${carton}
        ${b.hasPhoto ? '<span class="badge">📷</span>' : ""}
        ${b.description ? `<div class="muted small">${esc(b.description)}</div>` : ""}
        <div class="muted small">${fmtDate(b.createdAt)}</div>
      </div>
      <div class="box-actions">
        <a class="btn-mini" href="/view?id=${encodeURIComponent(
          b.id,
        )}" target="_blank" rel="noopener">Voir</a>
        <button class="btn-mini danger" data-del="${b.id}" type="button">Supprimer</button>
      </div>
    </div>
  `;
}

function wireRow(b: BoxMeta) {
  const btn = listEl.querySelector<HTMLButtonElement>(`[data-del="${b.id}"]`);
  btn?.addEventListener("click", async () => {
    const pwd = prompt("Mot de passe pour supprimer ce carton :");
    if (pwd === null) return;
    if (pwd !== "gab1") {
      setStatus("Mot de passe incorrect.", "err");
      return;
    }
    btn.disabled = true;
    try {
      await deleteBox(b.id);
      await refreshList();
    } catch (e) {
      setStatus("Erreur suppression : " + (e as Error).message, "err");
      btn.disabled = false;
    }
  });
}

// --- Init ---
updatePreview();
refreshConnectionUi();
refreshList();
