import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
      return NextResponse.json(
        { message: "Server configuration error" },
        { status: 500 }
      );
    }

    const response = await fetch(`${backendUrl}/api/v1/auth/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });

    // Forward cookies from backend to client
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      const cookies = setCookieHeader.split(/,(?=\s*\w+=)/);
      cookies.forEach((cookie) => {
        nextResponse.headers.append("set-cookie", cookie.trim());
      });
    }

    return nextResponse;
  } catch (error) {
    console.error("Signin proxy error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
