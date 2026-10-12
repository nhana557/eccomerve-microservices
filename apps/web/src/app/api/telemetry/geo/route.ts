import { NextResponse } from "next/server";
import { parseGeoHeaders } from "@/lib/geo";

export async function GET(request: Request) {
  const geo = parseGeoHeaders(request.headers);
  return NextResponse.json(geo);
}
