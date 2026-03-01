import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

async function proxyRequest(backendUrl: string, accessToken: string | undefined, method: string, body?: object) {
  return fetch(`${backendUrl}/api/v1/categories`, {
    method,
    headers: {
      Cookie: `accessToken=${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function withTokenRefresh(
  backendUrl: string,
  accessToken: string | undefined,
  refreshToken: string | undefined,
  method: string,
  body?: object
) {
  let response = await proxyRequest(backendUrl, accessToken, method, body);

  if (response.status === 403 && refreshToken) {
    const refreshResponse = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `refreshToken=${refreshToken}` },
    });
    if (refreshResponse.ok) {
      const setCookieHeader = refreshResponse.headers.get("set-cookie");
      const newAccessToken = setCookieHeader?.match(/accessToken=([^;]+)/)?.[1];
      if (newAccessToken) {
        response = await proxyRequest(backendUrl, newAccessToken, method, body);
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
    const backendUrl = process.env.BACKEND_URL;
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;
    if (!backendUrl) return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    return withTokenRefresh(backendUrl, accessToken, refreshToken, "GET");
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL;
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;
    const body = await request.json();
    if (!backendUrl) return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    return withTokenRefresh(backendUrl, accessToken, refreshToken, "POST", body);
  } catch (error) {
    console.error("Categories POST error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
