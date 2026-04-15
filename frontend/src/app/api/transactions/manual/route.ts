import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return NextResponse.json({ message: "Server configuration error" }, { status: 500 });

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    const body = await request.json();
    const response = await fetch(`${backendUrl}/api/v1/transactions/manual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Cookie: `accessToken=${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.status === 403) {
      return NextResponse.json(data, { status: 403 });
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Manual transaction proxy error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
