import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await db.query("SELECT NOW() as current_time");
    return NextResponse.json({
      status: "ok",
      database: "connected",
      timestamp: result.rows[0].current_time,
      message: "Database connection successful!",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
