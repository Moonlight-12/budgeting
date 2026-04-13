import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL!;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const body = await request.json();

  const res = await fetch(`${backendUrl}/api/v1/users/link-email/verify-otp`, {
    method: "POST",
    headers: { Cookie: `accessToken=${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
