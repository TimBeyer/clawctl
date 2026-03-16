import net from "net";
import { randomBytes } from "crypto";
import { DAEMON_SOCKET_PATH } from "./paths.js";

export interface DaemonRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface DaemonResponse {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export async function sendRequest(
  method: string,
  params?: Record<string, unknown>,
  timeoutMs: number = 5000,
): Promise<DaemonResponse> {
  return new Promise((resolve, reject) => {
    const id = randomBytes(8).toString("hex");
    const request: DaemonRequest = { id, method, params };

    const socket = net.createConnection({ path: DAEMON_SOCKET_PATH });
    let buffer = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error(`Daemon request "${method}" timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    socket.on("connect", () => {
      socket.write(JSON.stringify(request) + "\n");
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const newlineIdx = buffer.indexOf("\n");
      if (newlineIdx !== -1) {
        const line = buffer.slice(0, newlineIdx);
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          socket.end();
          try {
            const response = JSON.parse(line) as DaemonResponse;
            resolve(response);
          } catch {
            reject(new Error("Invalid response from daemon"));
          }
        }
      }
    });

    socket.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    socket.on("close", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error("Connection closed before response"));
      }
    });
  });
}
