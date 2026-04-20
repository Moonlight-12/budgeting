import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return NextResponse.json({ message: "Server configuration error" }, { status: 500 });

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    // Forward the multipart form data as-is
    const formData = await request.formData();
    const response = await fetch(`${backendUrl}/api/v1/transactions/import-csv`, {
      method: "POST",
      headers: {
        ...(accessToken ? { Cookie: `accessToken=${accessToken}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("CSV import proxy error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
