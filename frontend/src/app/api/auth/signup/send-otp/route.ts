import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL!;
  const body = await request.json();

  const res = await fetch(`${backendUrl}/api/v1/auth/signup/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
