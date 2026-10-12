import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET() {
  try {
    const data = await apiRequest("/api/v1/health");
    return NextResponse.json({
      status: "connected",
      gateway: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        message: "API Gateway unreachable",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
