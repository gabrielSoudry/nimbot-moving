/// <reference types="@cloudflare/workers-types" />

interface Env {
  BOXES: KVNamespace;
  ASSETS: Fetcher;
}

type BoxMeta = {
  id: string;
  room: string;
  boxNumber: string;
  description: string;
  hasPhoto: boolean;
  createdAt: number;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// --- Handlers API ---

// GET /api/boxes -> liste des cartons (metadonnees, sans les photos)
async function listBoxes(env: Env): Promise<Response> {
  const list = await env.BOXES.list({ prefix: "box:" });
  const metas = await Promise.all(
    list.keys.map(async (k) => {
      const v = await env.BOXES.get(k.name);
      return v ? (JSON.parse(v) as BoxMeta) : null;
    }),
  );
  const boxes = metas
    .filter((m): m is BoxMeta => m !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
  return json({ boxes });
}

// POST /api/boxes -> cree / met a jour un carton
async function saveBox(request: Request, env: Env): Promise<Response> {
  let body: {
    id?: string;
    room?: string;
    boxNumber?: string;
    description?: string;
    photo?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const id = (body.id ?? "").trim();
  if (!id) return json({ error: "id manquant" }, 400);

  const existingRaw = await env.BOXES.get(`box:${id}`);
  const existing = existingRaw ? (JSON.parse(existingRaw) as BoxMeta) : null;

  if (typeof body.photo === "string" && body.photo.length > 0) {
    await env.BOXES.put(`photo:${id}`, body.photo);
  }
  const hasPhoto =
    (typeof body.photo === "string" && body.photo.length > 0) ||
    (existing?.hasPhoto ?? false);

  const meta: BoxMeta = {
    id,
    room: (body.room ?? "").trim(),
    boxNumber: (body.boxNumber ?? "").trim(),
    description: (body.description ?? "").trim(),
    hasPhoto,
    createdAt: existing?.createdAt ?? Date.now(),
  };
  await env.BOXES.put(`box:${id}`, JSON.stringify(meta));
  return json(meta);
}

// GET /api/boxes/:id -> metadonnees + photo (data URL) si presente
async function getBox(id: string, env: Env): Promise<Response> {
  const raw = await env.BOXES.get(`box:${id}`);
  if (!raw) return json({ error: "introuvable" }, 404);
  const meta = JSON.parse(raw) as BoxMeta;
  const photo = meta.hasPhoto ? await env.BOXES.get(`photo:${id}`) : null;
  return json({ ...meta, photo });
}

// DELETE /api/boxes/:id -> supprime metadonnees + photo
async function deleteBox(id: string, env: Env): Promise<Response> {
  await env.BOXES.delete(`box:${id}`);
  await env.BOXES.delete(`photo:${id}`);
  return json({ ok: true });
}

async function handleApi(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> {
  // /api/boxes
  if (pathname === "/api/boxes") {
    if (request.method === "GET") return listBoxes(env);
    if (request.method === "POST") return saveBox(request, env);
    return json({ error: "Méthode non autorisée" }, 405);
  }

  // /api/boxes/:id
  const m = pathname.match(/^\/api\/boxes\/([^/]+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    if (request.method === "GET") return getBox(id, env);
    if (request.method === "DELETE") return deleteBox(id, env);
    return json({ error: "Méthode non autorisée" }, 405);
  }

  return json({ error: "Route inconnue" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url.pathname);
    }
    // Tout le reste : fichiers statiques (index.html, view.html, assets…)
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
