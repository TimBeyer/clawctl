import net from "net";
import { unlink } from "fs/promises";
import { DAEMON_SOCKET_PATH } from "./paths.js";
import type { DaemonRequest, DaemonResponse } from "./client.js";

export type RequestHandler = (
  method: string,
  params?: Record<string, unknown>,
) => Promise<{ ok: boolean; data?: unknown; error?: string }>;

export function createServer(handler: RequestHandler): net.Server {
  const server = net.createServer((socket) => {
    let buffer = "";

    socket.on("data", async (chunk) => {
      buffer += chunk.toString();
      const newlineIdx = buffer.indexOf("\n");
      if (newlineIdx === -1) return;

      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);

      let request: DaemonRequest;
      try {
        request = JSON.parse(line);
      } catch {
        const errorResponse: DaemonResponse = {
          id: "unknown",
          ok: false,
          error: "Invalid JSON request",
        };
        socket.end(JSON.stringify(errorResponse) + "\n");
        return;
      }

      try {
        const result = await handler(request.method, request.params);
        const response: DaemonResponse = {
          id: request.id,
          ...result,
        };
        socket.end(JSON.stringify(response) + "\n");
      } catch (err) {
        const response: DaemonResponse = {
          id: request.id,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
        socket.end(JSON.stringify(response) + "\n");
      }
    });

    socket.on("error", () => {
      // Client disconnected — ignore
    });
  });

  return server;
}

export async function listenOnSocket(server: net.Server): Promise<void> {
  // Remove stale socket file if it exists
  await unlink(DAEMON_SOCKET_PATH).catch(() => {});

  return new Promise((resolve, reject) => {
    server.listen(DAEMON_SOCKET_PATH, () => {
      resolve();
    });
    server.on("error", reject);
  });
}

export async function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      unlink(DAEMON_SOCKET_PATH).catch(() => {});
      resolve();
    });
  });
}
