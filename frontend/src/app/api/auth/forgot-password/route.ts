import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const body = await request.json();
    const response = await fetch(`${backendUrl}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Forgot password proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
