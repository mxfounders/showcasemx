import { NextRequest, NextResponse } from "next/server";
import { authSql } from "@/lib/auth/security";
import { recoveryConfig } from "@/lib/auth/recovery";
import { authorizedCron } from "@/lib/notifications/cron";
import { sendEmail } from "@/lib/notifications/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!authorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks = { database: false, homepage: false };
  const config = recoveryConfig();

  try {
    const sql = authSql();
    const [database, homepage] = await Promise.allSettled([
      sql`SELECT 1 AS healthy`,
      config
        ? fetch(config.origin, {
            cache: "no-store",
            headers: { "User-Agent": "shwcs-production-monitor/1.0" },
            signal: AbortSignal.timeout(8_000),
          })
        : Promise.reject(new Error("Origin unavailable")),
    ]);

    checks.database = database.status === "fulfilled";
    checks.homepage = homepage.status === "fulfilled" && homepage.value.ok;

    // Rows in solution_view_visitors only need to live long enough to dedupe
    // "today"'s views (src/lib/solutions/view-visitor.ts); Vercel Hobby has
    // no room for a third, dedicated cron (§42), so this reuses the daily
    // monitor. Best-effort: a failed cleanup never fails the health check —
    // an extra day of rows just delays being reclaimed, it never miscounts.
    if (checks.database) {
      try {
        await sql`DELETE FROM solution_view_visitors WHERE day < current_date - 3`;
      } catch {
        // Non-fatal; see comment above.
      }
    }
  } catch {
    // The result below remains false and produces a single bounded alert.
  }

  if (checks.database && checks.homepage) {
    return NextResponse.json(
      { status: "ok", checks },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const recipient = process.env.MONITOR_EMAIL_TO;
  if (recipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    try {
      const failed = Object.entries(checks)
        .filter(([, healthy]) => !healthy)
        .map(([name]) => name)
        .join(", ");
      const day = new Date().toISOString().slice(0, 10);
      await sendEmail(
        recipient,
        "Alerta de producción en shwcs",
        `La revisión diaria detectó problemas en: ${failed}.\n\nRevisa Vercel Observability y Neon antes de operar el sitio.`,
        `shwcs-production-monitor-${day}`,
      );
    } catch {
      return NextResponse.json(
        { status: "error", checks, alert: "failed" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  return NextResponse.json(
    { status: "error", checks, alert: recipient ? "sent" : "unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
