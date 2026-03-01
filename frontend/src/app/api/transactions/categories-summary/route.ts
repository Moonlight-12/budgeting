import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL;
    const cookieStore = await cookies();
    let accessToken = cookieStore.get("accessToken")?.value;
    const refreshToken = cookieStore.get("refreshToken")?.value;
    const utcOffset = request.nextUrl.searchParams.get("utcOffset") || "0";

    if (!backendUrl) {
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    }

    let response = await fetch(
      `${backendUrl}/api/v1/transactions/categories-summary?utcOffset=${utcOffset}`,
      { headers: { Cookie: `accessToken=${accessToken}` } }
    );

    if (response.status === 403 && refreshToken) {
      const refreshResponse = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { Cookie: `refreshToken=${refreshToken}` },
      });

      if (refreshResponse.ok) {
        const setCookieHeader = refreshResponse.headers.get("set-cookie");
        const newAccessToken = setCookieHeader?.match(/accessToken=([^;]+)/)?.[1];

        if (newAccessToken) {
          response = await fetch(
            `${backendUrl}/api/v1/transactions/categories-summary?utcOffset=${utcOffset}`,
            { headers: { Cookie: `accessToken=${newAccessToken}` } }
          );

          const data = await response.json();
          const nextResponse = NextResponse.json(data, { status: response.status });
          if (setCookieHeader) {
            setCookieHeader.split(/,(?=\s*\w+=)/).forEach((cookie) => {
              nextResponse.headers.append("set-cookie", cookie.trim());
            });
          }
          return nextResponse;
        }
      }
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Categories summary fetch error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
