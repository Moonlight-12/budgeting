import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

async function proxyRequest(method: string, body?: object) {
  const backendUrl = process.env.BACKEND_URL;
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!backendUrl) return NextResponse.json({ message: "Server configuration error" }, { status: 500 });

  const opts: RequestInit = {
    method,
    headers: { Cookie: `accessToken=${accessToken}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  let response = await fetch(`${backendUrl}/api/v1/budget/savings`, opts);

  if (response.status === 403 && refreshToken) {
    const refreshResponse = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `refreshToken=${refreshToken}` },
    });
    if (refreshResponse.ok) {
      const setCookieHeader = refreshResponse.headers.get("set-cookie");
      const newAccessToken = setCookieHeader?.match(/accessToken=([^;]+)/)?.[1];
      if (newAccessToken) {
        response = await fetch(`${backendUrl}/api/v1/budget/savings`, {
          ...opts,
          headers: { Cookie: `accessToken=${newAccessToken}`, "Content-Type": "application/json" },
        });
        const data = await response.json();
        const nextResponse = NextResponse.json(data, { status: response.status });
        if (setCookieHeader) {
          setCookieHeader.split(/,(?=\s*\w+=)/).forEach((c) => nextResponse.headers.append("set-cookie", c.trim()));
        }
        return nextResponse;
      }
    }
  }

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function GET() {
  try {
    return await proxyRequest("GET");
  } catch (error) {
    console.error("Savings GET error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await proxyRequest("POST", body);
  } catch (error) {
    console.error("Savings POST error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
