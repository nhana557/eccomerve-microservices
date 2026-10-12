export interface ClientGeoInfo {
  clientIP: string;
  clientLocation: string;
}

export function parseGeoHeaders(headers: Headers): ClientGeoInfo {
  let ip = "";
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    ip = forwarded.split(",")[0].trim();
  }
  if (!ip) {
    ip = headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "127.0.0.1";
  }

  const city = headers.get("x-vercel-ip-city") || headers.get("cf-ipcity");
  const country = headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry");

  let location = "";
  if (city && country) {
    location = `${city}, ${country}`;
  } else if (country) {
    location = country;
  }

  if (!location) {
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      location = "Localhost / Jakarta (ID)";
    } else {
      location = "Indonesia";
    }
  }

  return { clientIP: ip, clientLocation: location };
}

let cachedClientGeo: ClientGeoInfo | null = null;

export async function getClientIPAndLocation(): Promise<ClientGeoInfo> {
  if (typeof window === "undefined") {
    return { clientIP: "127.0.0.1", clientLocation: "Localhost / Jakarta (ID)" };
  }

  if (cachedClientGeo) {
    return cachedClientGeo;
  }

  try {
    const res = await fetch("/api/telemetry/geo", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.clientIP) {
        cachedClientGeo = data;
        return data;
      }
    }
  } catch {
    // Fallback if network offline
  }

  cachedClientGeo = { clientIP: "127.0.0.1", clientLocation: "Localhost / Jakarta (ID)" };
  return cachedClientGeo;
}
