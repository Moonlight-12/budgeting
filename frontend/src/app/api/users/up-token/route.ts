import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getTokens() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get("accessToken")?.value,
    refreshToken: cookieStore.get("refreshToken")?.value,
  };
}

async function proxyWithRefresh(method: string, accessToken: string | undefined, refreshToken: string | undefined, body?: object) {
  const backendUrl = process.env.BACKEND_URL!;
  const opts: RequestInit = {
    method,
    headers: { Cookie: `accessToken=${accessToken}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  let response = await fetch(`${backendUrl}/api/v1/users/up-token`, opts);

  if (response.status === 403 && refreshToken) {
    const refreshRes = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `refreshToken=${refreshToken}` },
    });
    if (refreshRes.ok) {
      const setCookieHeader = refreshRes.headers.get("set-cookie");
      const newToken = setCookieHeader?.match(/accessToken=([^;]+)/)?.[1];
      if (newToken) {
        response = await fetch(`${backendUrl}/api/v1/users/up-token`, {
          ...opts,
          headers: { Cookie: `accessToken=${newToken}`, "Content-Type": "application/json" },
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
    const { accessToken, refreshToken } = await getTokens();
    if (!process.env.BACKEND_URL) return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    return await proxyWithRefresh("GET", accessToken, refreshToken);
  } catch (error) {
    console.error("Up token GET error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { accessToken, refreshToken } = await getTokens();
    if (!process.env.BACKEND_URL) return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    const body = await request.json();
    return await proxyWithRefresh("PUT", accessToken, refreshToken, body);
  } catch (error) {
    console.error("Up token PUT error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
