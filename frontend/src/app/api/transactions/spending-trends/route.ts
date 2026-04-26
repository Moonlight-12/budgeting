import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL!;
  const cookieStore = await cookies();
  const search = request.nextUrl.search;

  const res = await fetch(`${backendUrl}/api/v1/transactions/spending-trends${search}`, {
    headers: { Cookie: cookieStore.toString() },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
