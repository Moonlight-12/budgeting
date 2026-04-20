import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL!;
  const body = await request.json();

  const res = await fetch(`${backendUrl}/api/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const nextResponse = NextResponse.json(data, { status: res.status });

  // Forward session cookies so the new account's session overwrites any existing one
  const setCookieHeader = res.headers.get("set-cookie");
  if (setCookieHeader) {
    setCookieHeader.split(/,(?=\s*\w+=)/).forEach((cookie) => {
      nextResponse.headers.append("set-cookie", cookie.trim());
    });
  }

  return nextResponse;
}
