import type { DashboardStats, FormattedTimeSeriesPoint, TimeRange } from '../_types/analytics';

/**
 * Pure SVG Cardinal / Cubic Bezier Spline Path Generator
 */
export function getSmoothPath(points: Array<[number, number]>): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  if (points.length === 2) {
    return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  }

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${Math.round(cp1x * 10) / 10} ${Math.round(cp1y * 10) / 10}, ${Math.round(cp2x * 10) / 10} ${Math.round(cp2y * 10) / 10}, ${Math.round(p2[0] * 10) / 10} ${Math.round(p2[1] * 10) / 10}`;
  }
  return d;
}

/**
 * Continuous, gap-free Time Series data strictly aligned to IST (`today`, `yesterday`, `7d`, `30d`, `90d`, `1y`, `all`).
 */
export function buildFormattedTimeSeries(
  timeSeries: DashboardStats['timeSeries'] | undefined,
  timeRange: TimeRange
): FormattedTimeSeriesPoint[] {
  if (!timeSeries) return [];

  const rawMap = new Map<string, { visitors: number; pageviews: number; clicks: number; leads: number }>();
  timeSeries.forEach((t) => {
    rawMap.set(t.period, {
      visitors: parseInt(t.visitors, 10) || 0,
      pageviews: parseInt(t.pageviews, 10) || 0,
      clicks: parseInt(t.clicks, 10) || 0,
      leads: parseInt(t.leads || '0', 10) || 0,
    });
  });

  if (timeRange === 'today' || timeRange === 'yesterday') {
    const isYesterday = timeRange === 'yesterday';
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentHour = nowIST.getHours();
    const endHour = isYesterday ? 23 : Math.max(currentHour, 12);

    const result: FormattedTimeSeriesPoint[] = [];
    for (let h = 0; h <= endHour; h++) {
      const periodKey = `${h.toString().padStart(2, '0')}:00`;
      const data = rawMap.get(periodKey) || { visitors: 0, pageviews: 0, clicks: 0, leads: 0 };
      const label = `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'PM' : 'AM'}`;
      result.push({
        period: periodKey,
        label,
        visitors: data.visitors,
        pageviews: data.pageviews,
        clicks: data.clicks,
        leads: data.leads,
        total: data.pageviews + data.clicks,
      });
    }
    return result;
  }

  if (timeRange === '7d' || timeRange === '30d' || timeRange === '90d') {
    const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const result: FormattedTimeSeriesPoint[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(nowIST);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const periodKey = `${y}-${m}-${day}`;
      const data = rawMap.get(periodKey) || { visitors: 0, pageviews: 0, clicks: 0, leads: 0 };
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      result.push({
        period: periodKey,
        label,
        visitors: data.visitors,
        pageviews: data.pageviews,
        clicks: data.clicks,
        leads: data.leads,
        total: data.pageviews + data.clicks,
      });
    }
    return result;
  }

  // '1y' and 'all' monthly ('YYYY-MM') or daily ('YYYY-MM-DD') rollups
  return timeSeries.map((t) => {
    let label = t.period;
    try {
      const parts = t.period.split('-').map((n) => parseInt(n, 10));
      if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        label = new Date(parts[0], parts[1] - 1, 1).toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        });
      } else if (parts.length >= 3) {
        label = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        });
      }
    } catch {
      // keep raw period label on parse failure
    }
    const v = parseInt(t.visitors, 10) || 0;
    const p = parseInt(t.pageviews, 10) || 0;
    const c = parseInt(t.clicks, 10) || 0;
    const l = parseInt(t.leads || '0', 10) || 0;
    return {
      period: t.period,
      label,
      visitors: v,
      pageviews: p,
      clicks: c,
      leads: l,
      total: p + c,
    };
  });
}
