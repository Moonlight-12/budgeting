import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const backendUrl = process.env.BACKEND_URL!;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  const res = await fetch(`${backendUrl}/api/v1/users/profile`, {
    headers: { Cookie: `accessToken=${accessToken}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
