import { describe, expect, it, vi } from "vitest";

import { startHealthServer } from "../../src/server/health.js";

describe("startHealthServer", () => {
  it("serves health status", async () => {
    const server = await startHealthServer({
      host: "127.0.0.1",
      port: 0,
      logger: {
        info: vi.fn(),
      } as any,
    });

    const response = await fetch(`${server.url}/healthz`);
    await server.stop();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
