function getRandomHex(bytes: number): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return Array.from({ length: bytes * 2 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

export function generateTraceParent(): string {
  const traceId = getRandomHex(16); // 32 hex chars
  const spanId = getRandomHex(8); // 16 hex chars
  return `00-${traceId}-${spanId}-01`;
}

export function parseTraceParent(
  header: string
): { traceId: string; spanId: string } | null {
  const parts = header.split("-");
  if (parts.length === 4 && parts[0] === "00") {
    return {
      traceId: parts[1],
      spanId: parts[2],
    };
  }
  return null;
}

export interface ClientSpanData {
  traceId: string;
  spanId: string;
  name: string;
  startTimeMs: number;
  durationMs: number;
  statusCode?: number;
  attributes?: Record<string, string | number | boolean>;
}

export async function exportTraceSpan(data: ClientSpanData): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/telemetry/traces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    // Non-blocking trace export failure
  }
}
