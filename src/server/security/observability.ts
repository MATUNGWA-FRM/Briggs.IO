import type { ApprovedProvider, SystemObservability } from '../../shared/types.ts';
import { getProviderStatuses } from '../config.ts';
import { getDb } from '../database/db.ts';

interface ProviderTelemetry {
  latencies: number[];
  successes: number;
  failures: number;
  lastError?: string;
  mode: 'LIVE_API' | 'MOCK_FIXTURE' | 'UNAVAILABLE';
}

const startedAt = Date.now();
const providerStats = new Map<ApprovedProvider, ProviderTelemetry>();
const analysisLatencies: number[] = [];

export function recordProviderCall(
  provider: ApprovedProvider,
  latencyMs: number,
  success: boolean,
  mode: 'LIVE_API' | 'MOCK_FIXTURE' | 'UNAVAILABLE',
  errorMsg?: string
): void {
  const existing = providerStats.get(provider) || {
    latencies: [],
    successes: 0,
    failures: 0,
    mode,
  };
  existing.latencies.push(latencyMs);
  if (existing.latencies.length > 50) existing.latencies.shift();
  if (success) existing.successes += 1;
  else {
    existing.failures += 1;
    existing.lastError = errorMsg;
  }
  existing.mode = mode;
  providerStats.set(provider, existing);
}

export function recordAnalysisLatency(ms: number): void {
  analysisLatencies.push(ms);
  if (analysisLatencies.length > 100) analysisLatencies.shift();
}

export function getSystemObservability(): SystemObservability {
  const db = getDb();
  let dbStatus: 'CONNECTED' | 'ERROR' = 'CONNECTED';
  let prodVersion = 'v1.3';
  let predictionsRecorded = 0;
  let outcomesEvaluated = 0;
  let noTradeCount = 0;
  let recentAuditLogs: SystemObservability['recent_audit_logs'] = [];

  try {
    const mv = db.prepare(`SELECT version FROM model_versions WHERE is_production = 1 LIMIT 1`).get() as
      | { version: string }
      | undefined;
    if (mv?.version) prodVersion = mv.version;

    const pCount = db.prepare(`SELECT COUNT(*) as c FROM predictions`).get() as { c: number };
    const oCount = db.prepare(`SELECT COUNT(*) as c FROM prediction_outcomes`).get() as { c: number };
    const ntCount = db.prepare(`SELECT COUNT(*) as c FROM predictions WHERE action_state = 'NO-TRADE'`).get() as {
      c: number;
    };
    predictionsRecorded = pCount?.c || 0;
    outcomesEvaluated = oCount?.c || 0;
    noTradeCount = ntCount?.c || 0;

    const logs = db
      .prepare(`SELECT id, timestamp, action, actor, detail FROM audit_logs ORDER BY timestamp DESC LIMIT 20`)
      .all() as Array<{ id: string; timestamp: string; action: string; actor: string; detail: string }>;
    recentAuditLogs = logs;
  } catch {
    dbStatus = 'ERROR';
  }

  const statuses = getProviderStatuses();
  const providers = statuses.map((s) => {
    const stat = providerStats.get(s.provider);
    const total = stat ? stat.successes + stat.failures : 0;
    const avgLatency =
      stat && stat.latencies.length > 0
        ? Math.round(stat.latencies.reduce((a, b) => a + b, 0) / stat.latencies.length)
        : 0;
    const successRate = total > 0 ? Math.round((stat!.successes / total) * 100) : s.configured ? 100 : 0;

    return {
      provider: s.provider,
      category: s.category,
      configured: s.configured,
      mode: stat?.mode || (s.configured ? 'LIVE_API' : 'MOCK_FIXTURE'),
      last_latency_ms: avgLatency,
      success_rate_pct: successRate,
      last_error: stat?.lastError,
    };
  });

  const avgProc =
    analysisLatencies.length > 0
      ? Math.round(analysisLatencies.reduce((a, b) => a + b, 0) / analysisLatencies.length)
      : 42;

  return {
    status: dbStatus === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED',
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    database_status: dbStatus,
    production_model_version: prodVersion,
    providers,
    pipeline_metrics: {
      avg_processing_latency_ms: avgProc,
      total_analyses_run: analysisLatencies.length,
      predictions_recorded: predictionsRecorded,
      outcomes_evaluated: outcomesEvaluated,
      no_trade_rate_pct:
        predictionsRecorded > 0 ? Math.round((noTradeCount / predictionsRecorded) * 100) : 0,
    },
    recent_audit_logs: recentAuditLogs,
  };
}
