import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

async function proxyPatch(
  backendUrl: string,
  accessToken: string | undefined,
  id: string,
  body: object
) {
  return fetch(`${backendUrl}/api/v1/transactions/${id}`, {
    method: "PATCH",
    headers: {
      Cookie: `accessToken=${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = process.env.BACKEND_URL;
    const cookieStore = await cookies();
    let accessToken = cookieStore.get("accessToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;
    const body = await request.json();

    if (!backendUrl) {
      return NextResponse.json(
        { message: "Server configuration error" },
        { status: 500 }
      );
    }

    let response = await proxyPatch(backendUrl, accessToken, id, body);

    if (response.status === 403 && refreshToken) {
      const refreshResponse = await fetch(
        `${backendUrl}/api/v1/auth/refresh`,
        {
          method: "POST",
          headers: { Cookie: `refreshToken=${refreshToken}` },
        }
      );

      if (refreshResponse.ok) {
        const setCookieHeader = refreshResponse.headers.get("set-cookie");
        const newAccessToken = setCookieHeader?.match(
          /accessToken=([^;]+)/
        )?.[1];

        if (newAccessToken) {
          response = await proxyPatch(backendUrl, newAccessToken, id, body);
          const data = await response.json();
          const nextResponse = NextResponse.json(data, {
            status: response.status,
          });
          if (setCookieHeader) {
            setCookieHeader
              .split(/,(?=\s*\w+=)/)
              .forEach((cookie) =>
                nextResponse.headers.append("set-cookie", cookie.trim())
              );
          }
          return nextResponse;
        }
      }
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Transaction PATCH error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
