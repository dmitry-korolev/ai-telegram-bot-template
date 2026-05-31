import { describe, expect, it } from "vitest";

import { serializeError } from "../src/shared/errors.js";

describe("serializeError", () => {
  it("redacts sensitive headers and truncates long bodies", () => {
    const error = Object.assign(new Error("provider failed"), {
      status: 500,
      headers: { authorization: "Bearer secret", "x-request-id": "req-1" },
      body: "x".repeat(2_100),
    });

    const serialized = serializeError(error);

    expect(serialized).toEqual(expect.objectContaining({
      name: "Error",
      message: "provider failed",
      status: 500,
      headers: { authorization: "[redacted]", "x-request-id": "req-1" },
    }));
    expect(String(serialized.body)).toContain("[truncated]");
    expect(String(serialized.body).length).toBeLessThan(2_100);
  });
});
