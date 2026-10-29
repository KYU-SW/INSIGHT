import { checkDatabaseConnection } from "@/lib/firebase-database";

export const runtime = "nodejs";

export async function GET() {
  try {
    await checkDatabaseConnection();
    return Response.json({ connected: true });
  } catch (error) {
    return Response.json({ connected: false, detail: error instanceof Error ? error.message : "Database connection failed." }, { status: 503 });
  }
}
