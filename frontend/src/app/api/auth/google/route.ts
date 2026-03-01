import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return NextResponse.json({ message: "Server configuration error" }, { status: 500 });

    const body = await request.json();

    const response = await fetch(`${backendUrl}/api/v1/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });

    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      setCookieHeader.split(/,(?=\s*\w+=)/).forEach((c) => nextResponse.headers.append("set-cookie", c.trim()));
    }

    return nextResponse;
  } catch (error) {
    console.error("Google auth proxy error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
