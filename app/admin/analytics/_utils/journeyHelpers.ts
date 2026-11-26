import type {
  AnalyticsEvent,
  JourneyDayGroup,
  JourneyEventFilter,
  JourneySession,
} from '../_types/analytics';
import { formatISTDayHeader, getISTDateKey } from './formatters';

function isRfqEvent(e: AnalyticsEvent): boolean {
  return (
    e.event_type === 'click' &&
    Boolean(
      e.element_target?.includes('wa.me') ||
        e.element_text?.toLowerCase().includes('whatsapp') ||
        e.element_target?.startsWith('tel:')
    )
  );
}

export function buildVisitorJourneyByDay(
  visitorJourney: AnalyticsEvent[],
  selectedVisitorIp: string | null,
  journeySortOrder: 'asc' | 'desc',
  journeyEventFilter: JourneyEventFilter
): JourneyDayGroup[] {
  if (!visitorJourney || visitorJourney.length === 0) return [];

  const groupsByDate: Record<string, AnalyticsEvent[]> = {};
  visitorJourney.forEach((ev) => {
    const k = getISTDateKey(ev.created_at);
    if (!groupsByDate[k]) groupsByDate[k] = [];
    groupsByDate[k].push(ev);
  });

  const sortedDates = Object.keys(groupsByDate).sort();
  if (sortedDates.length === 0) return [];

  const buildSession = (
    sessionEvents: AnalyticsEvent[],
    sessionNumber: number
  ): JourneySession => {
    const sStart = sessionEvents[0].created_at;
    const sEnd = sessionEvents[sessionEvents.length - 1].created_at;
    const dur = Math.max(
      0,
      Math.round((new Date(sEnd).getTime() - new Date(sStart).getTime()) / 1000)
    );
    return {
      sessionId: sessionEvents[0].session_id || `s-${sessionNumber}`,
      sessionNumber,
      startTime: sStart,
      endTime: sEnd,
      durationSeconds: dur,
      events: sessionEvents,
      hasRfq: sessionEvents.some(isRfqEvent),
      hasCopy: sessionEvents.some((e) => e.event_type === 'copy'),
      hasRageClick: sessionEvents.some((e) => e.event_type === 'rage_click'),
      distinctPages: Array.from(new Set(sessionEvents.map((e) => e.page_path).filter(Boolean))),
      hasDifferentIp: sessionEvents.some(
        (e) => Boolean(selectedVisitorIp && e.ip_address && e.ip_address !== selectedVisitorIp)
      ),
    };
  };

  const dayGroups: JourneyDayGroup[] = sortedDates.map((dateKey, idx) => {
    const dayEvents = [...groupsByDate[dateKey]].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const isInitialDay = idx === 0;
    let daysSinceLastVisit = 0;
    let daysSinceInitialVisit = 0;

    if (!isInitialDay) {
      const prevKey = sortedDates[idx - 1];
      const [y1, m1, d1] = prevKey.split('-').map(Number);
      const [y2, m2, d2] = dateKey.split('-').map(Number);
      const prevD = new Date(y1, m1 - 1, d1).getTime();
      const currD = new Date(y2, m2 - 1, d2).getTime();
      daysSinceLastVisit = Math.max(1, Math.round((currD - prevD) / 86400000));

      const [y0, m0, d0] = sortedDates[0].split('-').map(Number);
      const initD = new Date(y0, m0 - 1, d0).getTime();
      daysSinceInitialVisit = Math.max(1, Math.round((currD - initD) / 86400000));
    }

    const sessions: JourneySession[] = [];
    let currentSessionEvents: AnalyticsEvent[] = [];

    dayEvents.forEach((ev) => {
      if (currentSessionEvents.length === 0) {
        currentSessionEvents.push(ev);
      } else {
        const prevEv = currentSessionEvents[currentSessionEvents.length - 1];
        const timeDiffMs = new Date(ev.created_at).getTime() - new Date(prevEv.created_at).getTime();
        const sessionMismatch = Boolean(
          ev.session_id && prevEv.session_id && ev.session_id !== prevEv.session_id
        );
        const gapExceeded = timeDiffMs > 1800000;

        if (sessionMismatch || gapExceeded) {
          sessions.push(buildSession(currentSessionEvents, sessions.length + 1));
          currentSessionEvents = [ev];
        } else {
          currentSessionEvents.push(ev);
        }
      }
    });

    if (currentSessionEvents.length > 0) {
      sessions.push(buildSession(currentSessionEvents, sessions.length + 1));
    }

    const rfqCount = dayEvents.filter(isRfqEvent).length;
    const copyCount = dayEvents.filter((e) => e.event_type === 'copy').length;
    const uniqueVisitorIds = Array.from(
      new Set(dayEvents.map((e) => e.visitor_id).filter(Boolean))
    );
    const differentIpCount = dayEvents.filter(
      (e) => selectedVisitorIp && e.ip_address && e.ip_address !== selectedVisitorIp
    ).length;

    return {
      dateKey,
      dateLabel: formatISTDayHeader(dateKey),
      dayNumber: idx + 1,
      isInitialDay,
      isReturnDay: !isInitialDay,
      daysSinceLastVisit,
      daysSinceInitialVisit,
      eventsCount: dayEvents.length,
      sessions,
      rfqCount,
      copyCount,
      differentIpCount,
      uniqueVisitorIds,
    };
  });

  const filterEvent = (e: AnalyticsEvent) => {
    if (journeyEventFilter === 'all') return true;
    if (journeyEventFilter === 'rfq') return isRfqEvent(e);
    if (journeyEventFilter === 'copy') return e.event_type === 'copy';
    if (journeyEventFilter === 'product') {
      return Boolean(e.page_path?.startsWith('/products') || e.metadata?.productTitle);
    }
    if (journeyEventFilter === 'click') {
      return e.event_type === 'click' && !isRfqEvent(e);
    }
    return true;
  };

  const orderedDayGroups =
    journeySortOrder === 'desc'
      ? [...dayGroups].reverse().map((dayGroup) => ({
          ...dayGroup,
          sessions: [...dayGroup.sessions].reverse().map((sess) => ({
            ...sess,
            events: [...sess.events].reverse(),
          })),
        }))
      : dayGroups;

  if (journeyEventFilter === 'all') {
    return orderedDayGroups;
  }

  return orderedDayGroups
    .map((dayGroup) => ({
      ...dayGroup,
      sessions: dayGroup.sessions
        .map((sess) => ({
          ...sess,
          events: sess.events.filter(filterEvent),
        }))
        .filter((sess) => sess.events.length > 0),
    }))
    .filter((dayGroup) => dayGroup.sessions.length > 0);
}
