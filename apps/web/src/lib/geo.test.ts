import { expect, test, describe } from "bun:test";
import { getClientIPAndLocation, parseGeoHeaders } from "./geo";

describe("Client IP and Geo Location Helper", () => {
  test("parseGeoHeaders extracts IP and Location from standard proxy headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "182.253.140.25, 10.0.0.1",
      "x-vercel-ip-city": "Jakarta",
      "x-vercel-ip-country": "ID",
    });

    const geo = parseGeoHeaders(headers);
    expect(geo.clientIP).toBe("182.253.140.25");
    expect(geo.clientLocation).toBe("Jakarta, ID");
  });

  test("parseGeoHeaders falls back to Localhost / Indonesia for loopback address", () => {
    const headers = new Headers({
      "x-real-ip": "127.0.0.1",
    });

    const geo = parseGeoHeaders(headers);
    expect(geo.clientIP).toBe("127.0.0.1");
    expect(geo.clientLocation).toBe("Localhost / Jakarta (ID)");
  });
});
