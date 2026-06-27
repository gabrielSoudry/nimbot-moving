import {
  NiimbotBluetoothClient,
  ImageEncoder,
  type PrintProgressEvent,
} from "@mmote/niimbluelib";

let client: NiimbotBluetoothClient | null = null;

export function isConnected(): boolean {
  return client !== null;
}

// Connexion Bluetooth a l'imprimante (ouvre le selecteur d'appareil du navigateur).
export async function connect(
  onDisconnect?: () => void,
): Promise<NiimbotBluetoothClient> {
  if (client) return client;
  const c = new NiimbotBluetoothClient();
  c.on("disconnect", () => {
    client = null;
    onDisconnect?.();
  });
  await c.connect();
  client = c;
  return c;
}

export async function disconnect(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
  }
}

export type PrintOptions = {
  quantity: number;
  density?: number;
  onProgress?: (page: number, total: number) => void;
};

// Imprime le contenu d'un canvas. L'imprimante doit etre connectee.
export async function printCanvas(
  canvas: HTMLCanvasElement,
  opts: PrintOptions,
): Promise<void> {
  if (!client) throw new Error("Imprimante non connectée");

  const quantity = Math.max(1, opts.quantity);
  const encoded = ImageEncoder.encodeCanvas(canvas, "left");

  const taskName = client.getPrintTaskType() ?? "B1";
  const printTask = client.abstraction.newPrintTask(taskName, {
    totalPages: quantity,
    ...(opts.density != null ? { density: opts.density } : {}),
    statusPollIntervalMs: 100,
    statusTimeoutMs: 8_000,
  });

  const progressHandler = (e: PrintProgressEvent) => {
    opts.onProgress?.(e.page, quantity);
  };
  client.on("printprogress", progressHandler);

  try {
    await printTask.printInit();
    await printTask.printPage(encoded, quantity);
    await printTask.waitForFinished();
  } finally {
    client.off("printprogress", progressHandler);
    await printTask.printEnd();
  }
}
