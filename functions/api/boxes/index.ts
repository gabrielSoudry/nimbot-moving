/// <reference types="@cloudflare/workers-types" />

interface Env {
  BOXES: KVNamespace;
}

type BoxMeta = {
  id: string;
  room: string;
  boxNumber: string;
  hasPhoto: boolean;
  createdAt: number;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// GET /api/boxes -> liste des cartons (metadonnees, sans les photos)
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
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
};

// POST /api/boxes -> cree/met a jour un carton
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let body: {
    id?: string;
    room?: string;
    boxNumber?: string;
    photo?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const id = (body.id ?? "").trim();
  if (!id) return json({ error: "id manquant" }, 400);

  // Conserve la date de creation si le carton existe deja
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
    hasPhoto,
    createdAt: existing?.createdAt ?? Date.now(),
  };
  await env.BOXES.put(`box:${id}`, JSON.stringify(meta));
  return json(meta);
};
