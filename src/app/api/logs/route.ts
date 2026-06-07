import { NextResponse } from "next/server";
import { generateMockLogEntry } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const user = searchParams.get("user")?.toLowerCase();

  let logs = Array.from({ length: limit }, () => generateMockLogEntry());

  if (user) {
    logs = logs.filter(
      (l) =>
        l.pppoe_user.toLowerCase().includes(user) ||
        l.user_ip.includes(user) ||
        l.visited_ip.includes(user) ||
        l.mac.toLowerCase().includes(user)
    );
  }

  return NextResponse.json({ logs, count: logs.length });
}
