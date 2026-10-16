import { getClientIPAndLocation } from "./geo";

export interface LogEntry {
  time?: string;
  level: "INFO" | "WARN" | "ERROR";
  msg: string;
  service_name?: string;
  method?: string;
  fullUrl?: string;
  span_id?: string;
  trace_id?: string;
}

class FrontendLogger {
  private queue: LogEntry[] = [];
  private timer: any = null;
  private isFlushing = false;

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 250);
  }

  public async flush(): Promise<void> {
    if (this.queue.length === 0 || this.isFlushing) return;
    this.isFlushing = true;
    const batch = [...this.queue];
    this.queue = [];

    try {
      if (typeof window !== "undefined" && window.location) {
        for (const item of batch) {
          if (!item.fullUrl) {
            item.fullUrl = window.location.pathname + window.location.search;
          }
        }
      }

      await fetch("/api/telemetry/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
    } catch {
      // Graceful error silence
    } finally {
      this.isFlushing = false;
    }
  }

  public log(level: "INFO" | "WARN" | "ERROR", msg: string, meta?: Record<string, any>) {
    const fullUrl =
      meta?.fullUrl ||
      meta?.url ||
      (typeof window !== "undefined" && window.location
        ? window.location.pathname + window.location.search
        : "/");
    const method = meta?.method || meta?.http_method || "GET";

    const entry: LogEntry = {
      time: new Date().toISOString(),
      level,
      msg,
      service_name: "web-frontend",
      method,
      fullUrl,
      span_id: meta?.span_id,
      trace_id: meta?.trace_id,
    };

    this.queue.push(entry);

    if (this.queue.length >= 10) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  public clear() {
    this.queue = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public info(msg: string, meta?: Record<string, any>) {
    this.log("INFO", msg, meta);
  }

  public warn(msg: string, meta?: Record<string, any>) {
    this.log("WARN", msg, meta);
  }

  public error(msg: string, meta?: Record<string, any>) {
    this.log("ERROR", msg, meta);
  }
}

export const frontendLogger = new FrontendLogger();
