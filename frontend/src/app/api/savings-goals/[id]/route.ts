import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const backendUrl = process.env.BACKEND_URL!;
  const cookieStore = await cookies();
  const { id } = await params;
  const body = await request.json();

  const res = await fetch(`${backendUrl}/api/v1/savings-goals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookieStore.toString() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const backendUrl = process.env.BACKEND_URL!;
  const cookieStore = await cookies();
  const { id } = await params;

  const res = await fetch(`${backendUrl}/api/v1/savings-goals/${id}`, {
    method: "DELETE",
    headers: { Cookie: cookieStore.toString() },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
