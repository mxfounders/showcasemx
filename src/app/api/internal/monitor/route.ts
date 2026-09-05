import { NextRequest, NextResponse } from "next/server";
import { authSql } from "@/lib/auth/security";
import { recoveryConfig } from "@/lib/auth/recovery";
import { authorizedCron } from "@/lib/notifications/cron";
import { sendEmail } from "@/lib/notifications/server";
import { deleteObjects } from "@/lib/storage/blob";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!authorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks = { database: false, homepage: false };
  let orphansDeadLettered = 0;
  const config = recoveryConfig();

  // Orphaned blob sweep. Runs first (and only when explicitly enabled) so a slow
  // homepage probe cannot starve it. Best-effort: any failure here is swallowed
  // and the health check below still runs. Gated by STORAGE_SWEEP_ENABLED so a
  // rollback that nulls storage_key during the dual-read window cannot delete
  // bytes that are still needed.
  if (process.env.STORAGE_SWEEP_ENABLED === "true") {
    try {
      const sweepSql = authSql();
      // A resurrected key is never swept; this also clears over-eager enqueues.
      await sweepSql`DELETE FROM storage_orphans o
        WHERE EXISTS (SELECT 1 FROM solution_media m       WHERE m.storage_key = o.key)
           OR EXISTS (SELECT 1 FROM solution_media_files f WHERE f.storage_key = o.key)
           OR EXISTS (SELECT 1 FROM solution_site_images i WHERE i.storage_key = o.key)
           OR EXISTS (SELECT 1 FROM auth_accounts a        WHERE a.avatar_key  = o.key)`;
      // Lease a batch. attempts increments at lease time, so a run that dies
      // mid-batch still burns an attempt and cannot loop forever.
      const leased = await sweepSql`UPDATE storage_orphans SET attempts = attempts + 1,
          locked_until = now() + interval '10 minutes'
        WHERE key IN (SELECT key FROM storage_orphans
                      WHERE attempts < 5 AND (locked_until IS NULL OR locked_until < now())
                      ORDER BY deleted_at LIMIT 100)
        RETURNING key`;
      const keys = leased.map((r) => String(r.key));
      if (keys.length) {
        await deleteObjects(keys, AbortSignal.timeout(3_000));
        await sweepSql`DELETE FROM storage_orphans WHERE key = ANY(${keys})`;
      }
      const [dead] = await sweepSql`SELECT count(*)::int AS n FROM storage_orphans WHERE attempts >= 5`;
      orphansDeadLettered = Number(dead?.n ?? 0);
    } catch {
      // Non-fatal; leased rows unlock after 10 minutes and retry next run.
    }
  }

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
      { status: "ok", checks, orphansDeadLettered },
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
      await sendEmail({
        to: recipient,
        subject: "Alerta de producción en shwcs",
        text: `La revisión diaria detectó problemas en: ${failed}.\n\nRevisa Vercel Observability y Neon antes de operar el sitio.`,
        idempotencyKey: `shwcs-production-monitor-${day}`,
      });
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
