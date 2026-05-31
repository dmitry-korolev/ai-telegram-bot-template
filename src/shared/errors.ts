export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedError;
  status?: unknown;
  code?: unknown;
  headers?: unknown;
  body?: unknown;
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const candidate = error as Error & {
      cause?: unknown;
      status?: unknown;
      code?: unknown;
      headers?: unknown;
      response?: { headers?: unknown; data?: unknown; body?: unknown };
      body?: unknown;
    };

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: candidate.cause ? serializeError(candidate.cause) : undefined,
      status: candidate.status,
      code: candidate.code,
      headers: sanitizeHeaders(candidate.headers ?? candidate.response?.headers),
      body: sanitizeBody(candidate.body ?? candidate.response?.data ?? candidate.response?.body),
    };
  }

  return {
    name: typeof error,
    message: String(error),
  };
}

function sanitizeHeaders(headers: unknown): unknown {
  if (!headers || typeof headers !== "object") {
    return headers;
  }

  return Object.fromEntries(
    Object.entries(headers as Record<string, unknown>).map(([key, value]) => [
      key,
      /authorization|api-key|token|secret/i.test(key) ? "[redacted]" : value,
    ]),
  );
}

function sanitizeBody(body: unknown): unknown {
  if (typeof body !== "string") {
    return body;
  }

  return body.length > 2_000 ? `${body.slice(0, 2_000)}...[truncated]` : body;
}
