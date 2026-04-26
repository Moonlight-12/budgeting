import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const backendUrl = process.env.BACKEND_URL!;
  const cookieStore = await cookies();

  const res = await fetch(`${backendUrl}/api/v1/savings-goals`, {
    headers: { Cookie: cookieStore.toString() },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL!;
  const cookieStore = await cookies();
  const body = await request.json();

  const res = await fetch(`${backendUrl}/api/v1/savings-goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieStore.toString() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
