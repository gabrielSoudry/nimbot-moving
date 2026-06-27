import "./style.css";
import { ROOMS, LABEL_SIZES } from "./labels";
import { renderLabel, type LabelData } from "./render";
import { connect, disconnect, isConnected, printCanvas } from "./printer";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <header>
    <h1>📦 Étiquettes de déménagement</h1>
    <p>Choisis la pièce et le carton, l'app génère le QR code et l'imprime sur ta Niimbot.</p>
  </header>

  <div class="layout">
    <section class="card">
      <h2>Étiquette</h2>

      <div class="field">
        <label for="room">Pièce</label>
        <input id="room" list="rooms" placeholder="Ex. Cuisine" autocomplete="off" />
        <datalist id="rooms">
          ${ROOMS.map((r) => `<option value="${r}"></option>`).join("")}
        </datalist>
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

      <div class="field">
        <label for="size">Taille d'étiquette</label>
        <select id="size">
          ${LABEL_SIZES.map(
            (s, i) =>
              `<option value="${s.id}" ${i === 0 ? "selected" : ""}>${s.label}</option>`,
          ).join("")}
        </select>
      </div>
    </section>

    <section class="card">
      <h2>Aperçu &amp; impression</h2>
      <div class="preview-wrap">
        <canvas id="preview"></canvas>
      </div>

      <button id="connect" class="btn-secondary">
        <span class="dot" id="dot"></span><span id="connect-label">Connecter l'imprimante</span>
      </button>
      <button id="print" class="btn-primary" disabled>🖨️ Imprimer</button>

      <div class="status" id="status">Imprimante non connectée.</div>

      <p class="warn">
        ⚠️ Le Bluetooth nécessite Chrome / Edge et une page en <code>https</code> ou
        <code>localhost</code>. Allume l'imprimante et clique sur « Connecter ».
      </p>
    </section>
  </div>
`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const roomEl = $<HTMLInputElement>("room");
const boxEl = $<HTMLInputElement>("box");
const qtyEl = $<HTMLInputElement>("qty");
const sizeEl = $<HTMLSelectElement>("size");
const canvas = $<HTMLCanvasElement>("preview");
const connectBtn = $<HTMLButtonElement>("connect");
const connectLabel = $<HTMLSpanElement>("connect-label");
const dot = $<HTMLSpanElement>("dot");
const printBtn = $<HTMLButtonElement>("print");
const statusEl = $<HTMLDivElement>("status");

function setStatus(msg: string, kind: "" | "ok" | "err" = "") {
  statusEl.textContent = msg;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

function currentData(): LabelData {
  const size = LABEL_SIZES.find((s) => s.id === sizeEl.value) ?? LABEL_SIZES[0];
  return {
    room: roomEl.value.trim(),
    boxNumber: boxEl.value.trim(),
    size,
  };
}

let renderQueued = false;
async function updatePreview() {
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

function refreshConnectionUi() {
  const on = isConnected();
  dot.classList.toggle("on", on);
  connectLabel.textContent = on
    ? "Imprimante connectée — déconnecter"
    : "Connecter l'imprimante";
  printBtn.disabled = !on;
}

[roomEl, boxEl, sizeEl].forEach((el) =>
  el.addEventListener("input", updatePreview),
);

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
    console.error(e);
    setStatus("Échec de la connexion : " + (e as Error).message, "err");
  } finally {
    connectBtn.disabled = false;
  }
});

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
    await renderLabel(canvas, data);
    await printCanvas(canvas, {
      quantity,
      onProgress: (page, total) => setStatus(`Impression ${page}/${total}…`),
    });
    setStatus(`Imprimé ✓ (${quantity} étiquette${quantity > 1 ? "s" : ""})`, "ok");
  } catch (e) {
    console.error(e);
    setStatus("Erreur d'impression : " + (e as Error).message, "err");
  } finally {
    printBtn.disabled = !isConnected();
  }
});

updatePreview();
refreshConnectionUi();
