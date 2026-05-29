import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import type { AppLogger } from "../shared/logger.js";

export interface HealthServerOptions {
  host: string;
  port: number;
  logger: AppLogger;
}

export interface HealthServerHandle {
  url: string;
  stop: () => Promise<void>;
}

export async function startHealthServer(options: HealthServerOptions): Promise<HealthServerHandle> {
  const server = createServer((request, response) => {
    if (request.url === "/healthz") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });

  await listen(server, options.host, options.port);
  const address = server.address() as AddressInfo;
  const url = `http://${options.host}:${address.port}`;
  options.logger.info({ url }, "Health server started");

  return {
    url,
    stop: () => close(server),
  };
}

function listen(server: Server, host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
