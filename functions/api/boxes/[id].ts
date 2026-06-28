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

// GET /api/boxes/:id -> metadonnees + photo (data URL) si presente
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = String(params.id);
  const raw = await env.BOXES.get(`box:${id}`);
  if (!raw) return json({ error: "introuvable" }, 404);
  const meta = JSON.parse(raw) as BoxMeta;
  const photo = meta.hasPhoto ? await env.BOXES.get(`photo:${id}`) : null;
  return json({ ...meta, photo });
};

// DELETE /api/boxes/:id -> supprime metadonnees + photo
export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = String(params.id);
  await env.BOXES.delete(`box:${id}`);
  await env.BOXES.delete(`photo:${id}`);
  return json({ ok: true });
};
