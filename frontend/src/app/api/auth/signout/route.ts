import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Forward cookies from the client request to the backend
    const cookieHeader = request.headers.get("cookie");

    const response = await fetch(
      `${process.env.BACKEND_URL}/api/v1/auth/signout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader && { Cookie: cookieHeader }),
        },
      }
    );

    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });

    // Forward set-cookie headers (to clear cookies)
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      const cookies = setCookieHeader.split(/,(?=\s*\w+=)/);
      cookies.forEach((cookie) => {
        nextResponse.headers.append("set-cookie", cookie.trim());
      });
    }

    // Clear cookies on the Next.js side as well
    nextResponse.cookies.delete("accessToken");
    nextResponse.cookies.delete("refreshToken");

    return nextResponse;
  } catch (error) {
    console.error("Signout proxy error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
