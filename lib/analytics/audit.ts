import { query } from '@/lib/analytics/db';

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MINUTES = 15;

export interface AuditLogInput {
  actorIp?: string | null;
  actorLabel?: string;
  action: string;
  targetType?: string | null;
  targetValue?: string | null;
  success?: boolean;
  metadata?: Record<string, any> | null;
}

/**
 * Writes an immutable admin security/configuration action to `analytics_audit_logs`.
 */
export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const actorIp = input.actorIp ? String(input.actorIp).trim().slice(0, 64) : null;
    const actorLabel = (input.actorLabel || 'admin').slice(0, 64);
    const action = String(input.action).slice(0, 64);
    const targetType = input.targetType ? String(input.targetType).slice(0, 32) : null;
    const targetValue = input.targetValue ? String(input.targetValue).slice(0, 160) : null;
    const success = input.success !== false;
    const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

    await query(
      `
      INSERT INTO analytics_audit_logs (
        actor_ip,
        actor_label,
        action,
        target_type,
        target_value,
        success,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [actorIp, actorLabel, action, targetType, targetValue, success, metadataJson]
    );
  } catch (err) {
    console.error('[Audit Log Error]', err);
  }
}

export interface LoginRateLimitResult {
  allowed: boolean;
  failuresInWindow: number;
  retryAfterSeconds: number;
}

/**
 * Checks PostgreSQL-backed sliding window rate limit: max 5 failed logins per 15 min per IP.
 */
export async function checkLoginRateLimit(
  actorIp: string | null | undefined
): Promise<LoginRateLimitResult> {
  const normalizedIp = (actorIp || 'unknown').trim().slice(0, 64);

  try {
    const rows = await query<{
      failure_count: string;
      oldest_ts: string | null;
    }>(
      `
      SELECT
        COUNT(*)::text AS failure_count,
        MIN(created_at)::text AS oldest_ts
      FROM analytics_audit_logs
      WHERE action = 'login'
        AND success = FALSE
        AND actor_ip = $1
        AND created_at >= NOW() - INTERVAL '${LOGIN_WINDOW_MINUTES} minutes'
      `,
      [normalizedIp]
    );

    const failures = parseInt(rows[0]?.failure_count || '0', 10);
    if (failures < LOGIN_MAX_FAILURES) {
      return {
        allowed: true,
        failuresInWindow: failures,
        retryAfterSeconds: 0,
      };
    }

    const oldestMs = rows[0]?.oldest_ts ? new Date(rows[0].oldest_ts).getTime() : Date.now();
    const windowEndMs = oldestMs + LOGIN_WINDOW_MINUTES * 60 * 1000;
    const retryAfterSeconds = Math.max(1, Math.ceil((windowEndMs - Date.now()) / 1000));

    return {
      allowed: false,
      failuresInWindow: failures,
      retryAfterSeconds,
    };
  } catch (err) {
    console.error('[Login Rate Limit Check Error]', err);
    return { allowed: true, failuresInWindow: 0, retryAfterSeconds: 0 };
  }
}
