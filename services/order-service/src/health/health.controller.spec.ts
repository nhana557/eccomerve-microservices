import { describe, it, expect } from "bun:test";
import { HealthController } from "./health.controller";

describe("HealthController Unit Test", () => {
  it("should return ok status when database responds successfully", async () => {
    const mockDataSource = {
      query: async (sql: string) => [{ "?column?": 1 }],
    };

    const controller = new HealthController(mockDataSource as any);
    const result = await controller.health();

    expect(result.status).toBe("ok");
    expect(result.service).toBe("order-service");
    expect(result.database).toBe("ok");
  });

  it("should return degraded status when database throws error", async () => {
    const mockDataSource = {
      query: async () => {
        throw new Error("Connection failed");
      },
    };

    const controller = new HealthController(mockDataSource as any);
    const result = await controller.health();

    expect(result.status).toBe("degraded");
    expect(result.database).toBe("error");
  });
});
