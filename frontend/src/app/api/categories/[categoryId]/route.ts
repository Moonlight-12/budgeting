import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

async function proxy(backendUrl: string, accessToken: string | undefined, refreshToken: string | undefined, categoryId: string, method: string, body?: object) {
  const url = `${backendUrl}/api/v1/categories/${categoryId}`;
  const headers: Record<string, string> = { Cookie: `accessToken=${accessToken}` };
  if (body) headers["Content-Type"] = "application/json";

  let response = await fetch(url, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });

  if (response.status === 403 && refreshToken) {
    const refreshResponse = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `refreshToken=${refreshToken}` },
    });
    if (refreshResponse.ok) {
      const setCookieHeader = refreshResponse.headers.get("set-cookie");
      const newAccessToken = setCookieHeader?.match(/accessToken=([^;]+)/)?.[1];
      if (newAccessToken) {
        response = await fetch(url, {
          method,
          headers: { Cookie: `accessToken=${newAccessToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}),
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  try {
    const backendUrl = process.env.BACKEND_URL;
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;
    const { categoryId } = await params;
    const body = await request.json();
    if (!backendUrl) return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    return proxy(backendUrl, accessToken, refreshToken, categoryId, "PUT", body);
  } catch (error) {
    console.error("Category PUT error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  try {
    const backendUrl = process.env.BACKEND_URL;
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;
    const { categoryId } = await params;
    if (!backendUrl) return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    return proxy(backendUrl, accessToken, refreshToken, categoryId, "DELETE");
  } catch (error) {
    console.error("Category DELETE error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
