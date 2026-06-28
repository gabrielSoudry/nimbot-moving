// Client de l'API Cloudflare (Pages Functions + KV).

export type BoxMeta = {
  id: string;
  room: string;
  boxNumber: string;
  hasPhoto: boolean;
  createdAt: number;
};

export type BoxFull = BoxMeta & {
  photo: string | null; // data URL JPEG, ou null
};

// Genere un identifiant court (base36) pour garder le QR compact.
export function shortId(): string {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 10);
}

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${txt}`.trim());
  }
  return res.json();
}

export async function listBoxes(): Promise<BoxMeta[]> {
  const res = await fetch("/api/boxes");
  const data = (await jsonOrThrow(res)) as { boxes: BoxMeta[] };
  return data.boxes;
}

export async function saveBox(input: {
  id: string;
  room: string;
  boxNumber: string;
  photo: string | null;
}): Promise<BoxMeta> {
  const res = await fetch("/api/boxes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await jsonOrThrow(res)) as BoxMeta;
}

export async function getBox(id: string): Promise<BoxFull> {
  const res = await fetch(`/api/boxes/${encodeURIComponent(id)}`);
  return (await jsonOrThrow(res)) as BoxFull;
}

export async function deleteBox(id: string): Promise<void> {
  const res = await fetch(`/api/boxes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
