import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL;
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!backendUrl) {
      return NextResponse.json(
        { message: "Server configuration error" },
        { status: 500 }
      );
    }

    const response = await fetch(`${backendUrl}/api/v1/transactions/monthly`, {
      headers: {
        Cookie: `accessToken=${accessToken}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Monthly transactions fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
