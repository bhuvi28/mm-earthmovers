'use client';

import React, { useMemo, useState } from 'react';
import { getIndustrialClusterTag } from '@/lib/analytics/clusters';
import type { AdminTabId, DashboardStats, GeoLevel, GeoTab } from '../_types/analytics';
import {
  decodeCityName,
  getChannelCategory,
  getCountryFlag,
  triggerCsvDownload,
} from '../_utils/formatters';

interface AudienceGeoTabProps {
  stats: DashboardStats | null;
  setActiveTab: (tab: AdminTabId) => void;
  setEventSearch: (val: string) => void;
  setProductSearch: (val: string) => void;
}

export default function AudienceGeoTab({
  stats,
  setActiveTab,
  setEventSearch,
  setProductSearch,
}: AudienceGeoTabProps) {
  const [geoSearch, setGeoSearch] = useState('');
  const [geoTab, setGeoTab] = useState<GeoTab>('all');
  const [geoLevel, setGeoLevel] = useState<GeoLevel>('cities');

  const totalGeoVisitors =
    (stats?.topCountries || []).reduce((acc, c) => acc + (parseInt(c.visitor_count, 10) || 0), 0) ||
    Number(stats?.kpis?.totalVisitors) ||
    1;
  const totalSessions =
    (stats?.topReferrers || []).reduce((acc, r) => acc + (parseInt(r.count, 10) || 0), 0) || 1;
  const totalDevices =
    (stats?.devices || []).reduce((acc, d) => acc + (parseInt(d.count, 10) || 0), 0) || 1;
  const mobileCount =
    stats?.devices?.find((d) => d.device_type?.toLowerCase() === 'mobile')?.count || '0';
  const mobilePct = Math.round(((parseInt(mobileCount, 10) || 0) / totalDevices) * 100);

  const channelsList = useMemo(() => {
    const channelMap = new Map<
      string,
      { count: number; icon: string; color: string; bg: string }
    >();
    (stats?.topReferrers || []).forEach((ref) => {
      const ch = getChannelCategory(ref.referrer);
      const cur = channelMap.get(ch.name) || {
        count: 0,
        icon: ch.icon,
        color: ch.color,
        bg: ch.bg,
      };
      cur.count += parseInt(ref.count, 10) || 0;
      channelMap.set(ch.name, cur);
    });
    return Array.from(channelMap.entries())
      .map(([name, data]) => ({
        name,
        ...data,
        pct: Math.round((data.count / totalSessions) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [stats?.topReferrers, totalSessions]);

  const topCountry = stats?.topCountries?.[0];
  const topCity = stats?.topCities?.[0];
  const topChannel = channelsList[0];

  const q = (geoSearch || '').toLowerCase().trim();
  const filteredCountries = (stats?.topCountries || []).filter((c) => {
    const countryLower = (c.country || '').toLowerCase();
    const countryCodeLower = (c.country_code || '').toLowerCase();
    if (geoTab === 'india' && c.country_code !== 'IN' && countryLower !== 'india')
      return false;
    if (
      geoTab === 'international' &&
      (c.country_code === 'IN' || countryLower === 'india')
    )
      return false;
    if (q) return countryLower.includes(q) || countryCodeLower.includes(q);
    return true;
  });

  const filteredCities = (stats?.topCities || []).filter((c) => {
    const cityDecoded = decodeCityName(c.city);
    const countryLower = (c.country || '').toLowerCase();
    if (geoTab === 'india' && countryLower !== 'india') return false;
    if (geoTab === 'international' && countryLower === 'india') return false;
    if (q) {
      return (
        cityDecoded.toLowerCase().includes(q) ||
        (c.region || '').toLowerCase().includes(q) ||
        countryLower.includes(q)
      );
    }
    return true;
  });

  const filteredRegions = (stats?.topRegions || []).filter((r) => {
    const countryLower = (r.country || '').toLowerCase();
    if (geoTab === 'india' && countryLower !== 'india') return false;
    if (geoTab === 'international' && countryLower === 'india') return false;
    if (q) return (r.region || '').toLowerCase().includes(q) || countryLower.includes(q);
    return true;
  });

  const handleExportGeoCSV = () => {
    if (!stats) return;
    const headers = [
      'Category',
      'Name',
      'Region / State',
      'Country',
      'Visitors',
      'Share %',
      'Buyer Inquiries (RFQs)',
    ];
    const totalVisitors = Number(stats.kpis.totalVisitors) || 1;
    const rows: Array<Array<string | number>> = [];

    stats.topCountries?.forEach((c) => {
      const count = parseInt(c.visitor_count, 10) || 0;
      rows.push([
        'Country',
        `"${c.country}"`,
        '-',
        `"${c.country_code}"`,
        count,
        `${Math.round((count / totalVisitors) * 100)}%`,
        c.inquiries_count || 0,
      ]);
    });
    stats.topRegions?.forEach((r) => {
      const count = parseInt(r.visitor_count, 10) || 0;
      rows.push([
        'Region / State',
        `"${r.region}"`,
        `"${r.region}"`,
        `"${r.country}"`,
        count,
        `${Math.round((count / totalVisitors) * 100)}%`,
        r.inquiries_count || 0,
      ]);
    });
    stats.topCities?.forEach((c) => {
      const count = parseInt(c.visitor_count, 10) || 0;
      rows.push([
        'City',
        `"${decodeCityName(c.city)}"`,
        `"${c.region || ''}"`,
        `"${c.country}"`,
        count,
        `${Math.round((count / totalVisitors) * 100)}%`,
        c.inquiries_count || 0,
      ]);
    });
    stats.topReferrers?.forEach((r) => {
      const count = parseInt(r.count, 10) || 0;
      rows.push(['Source', `"${r.referrer}"`, '-', '-', count, '-', '-']);
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    triggerCsvDownload(
      `mm-earthmovers-geo-${new Date().toISOString().split('T')[0]}.csv`,
      csvContent
    );
  };

  const exportFunnel = stats?.exportFunnelStats;

  return (
    <div className="space-y-6">
      {/* 1. TOP GEO & SOURCES KPI SUMMARY SCORECARDS */}
      <div className="flex md:grid overflow-x-auto md:overflow-x-visible scrollbar-hide snap-x touch-pan-x gap-2.5 pb-2 -mx-4 px-4 md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:mx-0 md:px-0">
        <div className="shrink-0 snap-start w-[150px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Top Market
            </span>
            <span className="text-lg sm:text-xl">
              {topCountry ? getCountryFlag(topCountry.country_code) : '🌐'}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-sans truncate">
            {topCountry ? topCountry.country : 'Unknown'}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 hidden sm:block truncate">
            {topCountry
              ? `${topCountry.visitor_count} visitors (${Math.round(
                  ((parseInt(topCountry.visitor_count, 10) || 0) / totalGeoVisitors) * 100
                )}% of traffic)`
              : 'No geo data'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block sm:hidden truncate">
            {topCountry ? `${topCountry.visitor_count} visitors` : 'No data'}
          </span>
        </div>

        <div className="shrink-0 snap-start w-[150px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Top Hub City
            </span>
            <span className="text-lg sm:text-xl">🏙️</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1 font-sans truncate">
            {topCity ? decodeCityName(topCity.city) : 'Unknown'}
          </div>
          <span className="text-[11px] text-emerald-800/80 mt-1 hidden sm:block truncate">
            {topCity
              ? `${topCity.region ? `${topCity.region}, ` : ''}${topCity.country} • ${topCity.visitor_count} visitors`
              : 'No city data'}
          </span>
          <span className="text-[10px] text-emerald-700/80 mt-0.5 block sm:hidden truncate">
            {topCity ? `${topCity.visitor_count} visitors` : 'No data'}
          </span>
        </div>

        <div className="shrink-0 snap-start w-[150px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              Primary Channel
            </span>
            <span className="text-lg sm:text-xl">{topChannel?.icon || '🔗'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-700 mt-1 font-sans truncate">
            {topChannel ? topChannel.name : 'Direct'}
          </div>
          <span className="text-[11px] text-blue-800/80 mt-1 hidden sm:block truncate">
            {topChannel
              ? `${topChannel.count} sessions (${topChannel.pct}% of traffic)`
              : 'Direct visits'}
          </span>
          <span className="text-[10px] text-blue-700/80 mt-0.5 block sm:hidden truncate">
            {topChannel ? `${topChannel.count} sessions` : 'Direct'}
          </span>
        </div>

        <div className="shrink-0 snap-start w-[150px] md:w-auto bg-white border border-slate-200/90 rounded-xl md:rounded-2xl p-3 sm:p-5 shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
              Mobile Share
            </span>
            <span className="text-lg sm:text-xl">📱</span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-700 mt-1 font-sans">
            {mobilePct}% Mobile
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-200/80">
            <div
              className="bg-purple-600 h-1.5 rounded-full"
              style={{ width: `${mobilePct}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. UNIFIED GEOGRAPHIC INTELLIGENCE HUB */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>📍 Commercial Geographic Intelligence</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                Live Cloudflare Geo
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Procurement footprint and buyer inquiries mapped across industrial mining clusters, domestic states, and export markets
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setGeoLevel('cities')}
                style={{ color: geoLevel === 'cities' ? '#ffffff' : undefined }}
                className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  geoLevel === 'cities'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🏙️</span>
                <span>Cities ({filteredCities.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setGeoLevel('regions')}
                style={{ color: geoLevel === 'regions' ? '#ffffff' : undefined }}
                className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  geoLevel === 'regions'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🏛️</span>
                <span>States ({filteredRegions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setGeoLevel('countries')}
                style={{ color: geoLevel === 'countries' ? '#ffffff' : undefined }}
                className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  geoLevel === 'countries'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🌍</span>
                <span>Countries ({filteredCountries.length})</span>
              </button>
            </div>

            <div className="bg-slate-100/80 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setGeoTab('all')}
                className={`min-h-[44px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  geoTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setGeoTab('india')}
                className={`min-h-[44px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer ${
                  geoTab === 'india'
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇮🇳</span>
                <span>India</span>
              </button>
              <button
                type="button"
                onClick={() => setGeoTab('international')}
                className={`min-h-[44px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer ${
                  geoTab === 'international'
                    ? 'bg-white text-blue-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🌐</span>
                <span>Export</span>
              </button>
            </div>

            <div className="relative min-w-[160px] sm:min-w-[190px]">
              <input
                type="text"
                value={geoSearch}
                onChange={(e) => setGeoSearch(e.target.value)}
                placeholder="Search location..."
                className="w-full min-h-[44px] sm:min-h-[34px] px-3 py-1.5 pl-7 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <span className="absolute left-2.5 top-3 sm:top-2 text-xs text-slate-400">🔍</span>
              {geoSearch && (
                <button
                  type="button"
                  onClick={() => setGeoSearch('')}
                  className="absolute right-2.5 top-3 sm:top-1.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportGeoCSV}
              className="min-h-[44px] sm:min-h-[34px] px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Export Geographic & Acquisition Data to CSV"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Macro Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-600">Top Inquiring Hub:</span>
            <strong className="text-slate-900">
              {topCity
                ? `${decodeCityName(topCity.city)}, ${topCity.region || topCity.country}`
                : 'None'}
            </strong>
            {topCity?.inquiries_count && parseInt(topCity.inquiries_count, 10) > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {topCity.inquiries_count} RFQs
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-slate-500 text-[11px]">
            <span>
              🇮🇳 India Domestic:{' '}
              <strong className="text-slate-800">
                {Math.round(
                  ((parseInt(topCountry?.visitor_count || '0', 10) || 0) / totalGeoVisitors) * 100
                )}
                %
              </strong>
            </span>
            <span>•</span>
            <span>
              🌐 Export Inquiries:{' '}
              <strong className="text-slate-800">
                {Math.max(
                  100 -
                    Math.round(
                      ((parseInt(topCountry?.visitor_count || '0', 10) || 0) / totalGeoVisitors) *
                        100
                    ),
                  0
                )}
                %
              </strong>
            </span>
          </div>
        </div>

        {/* Mobile Cards for Geo & Audience (< 768px) */}
        <div className="block md:hidden space-y-3">
          {geoLevel === 'cities' &&
            (filteredCities.length > 0 ? (
              filteredCities.map((city, idx) => {
                const count = parseInt(city.visitor_count, 10) || 0;
                const pct = Math.round((count / totalGeoVisitors) * 100);
                const cityClean = decodeCityName(city.city);
                const inquiries = parseInt(city.inquiries_count || '0', 10);
                const cluster = getIndustrialClusterTag(cityClean, city.region);
                const flag = getCountryFlag(
                  city.country_code || ((city.country || '').toLowerCase() === 'india' ? 'IN' : 'UN')
                );

                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{flag}</span>
                            <span className="truncate">{cityClean}</span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {city.region || city.country}
                          </span>
                        </div>
                      </div>
                      {cluster && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${cluster.bg}`}
                        >
                          {cluster.icon} {cluster.name}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>
                          {count} visitors ({pct}%)
                        </span>
                        {inquiries > 0 && (
                          <span className="text-emerald-700 font-semibold">💬 {inquiries} RFQs</span>
                        )}
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEventSearch(cityClean);
                          setActiveTab('stream');
                        }}
                        className="flex-1 min-h-[44px] py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      >
                        Stream
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch(cityClean);
                          setActiveTab('products');
                        }}
                        className="flex-1 min-h-[44px] py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      >
                        Demand
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No cities match your search.
              </div>
            ))}

          {geoLevel === 'regions' &&
            (filteredRegions.length > 0 ? (
              filteredRegions.map((region, idx) => {
                const count = parseInt(region.visitor_count, 10) || 0;
                const pct = Math.round((count / totalGeoVisitors) * 100);
                const inquiries = parseInt(region.inquiries_count || '0', 10);
                const flag = getCountryFlag(
                  region.country_code || ((region.country || '').toLowerCase() === 'india' ? 'IN' : 'UN')
                );

                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                            <span>{flag}</span>
                            <span>{region.region}</span>
                          </div>
                          <span className="text-xs text-slate-500">{region.country}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>
                          {count} visitors ({pct}%)
                        </span>
                        {inquiries > 0 && (
                          <span className="text-emerald-700 font-semibold">💬 {inquiries} RFQs</span>
                        )}
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEventSearch(region.region);
                          setActiveTab('stream');
                        }}
                        className="flex-1 min-h-[44px] py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      >
                        Stream
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch(region.region);
                          setActiveTab('products');
                        }}
                        className="flex-1 min-h-[44px] py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      >
                        Demand
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No states match your search.
              </div>
            ))}

          {geoLevel === 'countries' &&
            (filteredCountries.length > 0 ? (
              filteredCountries.map((country, idx) => {
                const count = parseInt(country.visitor_count, 10) || 0;
                const pct = Math.round((count / totalGeoVisitors) * 100);
                const inquiries = parseInt(country.inquiries_count || '0', 10);
                const flag = getCountryFlag(country.country_code);

                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                          <span>{flag}</span>
                          <span>{country.country}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>
                          {count} visitors ({pct}%)
                        </span>
                        {inquiries > 0 && (
                          <span className="text-emerald-700 font-semibold">💬 {inquiries} RFQs</span>
                        )}
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEventSearch(country.country);
                          setActiveTab('stream');
                        }}
                        className="flex-1 min-h-[44px] py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      >
                        Stream
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch(country.country);
                          setActiveTab('products');
                        }}
                        className="flex-1 min-h-[44px] py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
                      >
                        Demand
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No countries match your search.
              </div>
            ))}
        </div>

        {/* Master Interactive Data Table (Desktop >= 768px Preserved) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-semibold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4"># Rank &amp; Commercial Hub</th>
                <th className="py-3 px-4">Region / Market</th>
                <th className="py-3 px-4 text-center">Visitors &amp; Share</th>
                <th className="py-3 px-4 text-center">Buyer Intent &amp; RFQs</th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {geoLevel === 'cities' &&
                (filteredCities.length > 0 ? (
                  filteredCities.map((city, idx) => {
                    const count = parseInt(city.visitor_count, 10) || 0;
                    const pct = Math.round((count / totalGeoVisitors) * 100);
                    const cityClean = decodeCityName(city.city);
                    const inquiries = parseInt(city.inquiries_count || '0', 10);
                    const cluster = getIndustrialClusterTag(cityClean, city.region);
                    const flag = getCountryFlag(
                      city.country_code || ((city.country || '').toLowerCase() === 'india' ? 'IN' : 'UN')
                    );

                    return (
                      <tr key={idx} className="hover:bg-amber-50/20 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-semibold text-slate-400 w-6">
                              #{idx + 1}
                            </span>
                            <span className="text-lg">{flag}</span>
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                <span>{cityClean}</span>
                                {cluster && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${cluster.bg}`}
                                  >
                                    {cluster.icon} {cluster.name}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {city.region ? `${city.region}, ` : ''}
                                {city.country}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {city.region ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-xs font-semibold">
                              {city.region}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {count}{' '}
                            <span className="text-slate-400 font-normal">({pct}%)</span>
                          </div>
                          <div className="w-24 bg-slate-100 rounded-full h-1 mx-auto mt-1 overflow-hidden">
                            <div
                              className="bg-amber-500 h-1 rounded-full"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {inquiries > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>💬</span>
                              <span>
                                {inquiries} RFQ{inquiries > 1 ? 's' : ''} Generated
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Browsing</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('stream');
                                setEventSearch(cityClean);
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold transition"
                              title={`Filter Live Stream for ${cityClean}`}
                            >
                              ⚡ Stream
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProductSearch(cityClean);
                                setActiveTab('products');
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
                              title={`Inspect Demand for ${cityClean}`}
                            >
                              Demand
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                      No matching cities found in this filter range.
                    </td>
                  </tr>
                ))}

              {geoLevel === 'regions' &&
                (filteredRegions.length > 0 ? (
                  filteredRegions.map((region, idx) => {
                    const count = parseInt(region.visitor_count, 10) || 0;
                    const pct = Math.round((count / totalGeoVisitors) * 100);
                    const inquiries = parseInt(region.inquiries_count || '0', 10);
                    const flag = getCountryFlag(
                      region.country_code || ((region.country || '').toLowerCase() === 'india' ? 'IN' : 'UN')
                    );

                    return (
                      <tr key={idx} className="hover:bg-amber-50/20 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-semibold text-slate-400 w-6">
                              #{idx + 1}
                            </span>
                            <span className="text-lg">{flag}</span>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{region.region}</div>
                              <span className="text-[11px] text-slate-400">{region.country}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-xs font-semibold">
                            {region.country}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {count}{' '}
                            <span className="text-slate-400 font-normal">({pct}%)</span>
                          </div>
                          <div className="w-24 bg-slate-100 rounded-full h-1 mx-auto mt-1 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1 rounded-full"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {inquiries > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>💬</span>
                              <span>
                                {inquiries} RFQ{inquiries > 1 ? 's' : ''}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Browsing</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('stream');
                              setEventSearch(region.region);
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold transition"
                          >
                            ⚡ Stream
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                      No regional state data matches the filter.
                    </td>
                  </tr>
                ))}

              {geoLevel === 'countries' &&
                (filteredCountries.length > 0 ? (
                  filteredCountries.map((country, idx) => {
                    const count = parseInt(country.visitor_count, 10) || 0;
                    const pct = Math.round((count / totalGeoVisitors) * 100);
                    const inquiries = parseInt(country.inquiries_count || '0', 10);
                    const flag = getCountryFlag(country.country_code);

                    return (
                      <tr key={idx} className="hover:bg-amber-50/20 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-semibold text-slate-400 w-6">
                              #{idx + 1}
                            </span>
                            <span className="text-xl">{flag}</span>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">
                                {country.country}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({country.country_code})
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-xs font-semibold">
                            {country.country_code === 'IN' ? 'Domestic' : 'International / Export'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {count}{' '}
                            <span className="text-slate-400 font-normal">({pct}%)</span>
                          </div>
                          <div className="w-24 bg-slate-100 rounded-full h-1 mx-auto mt-1 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1 rounded-full"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {inquiries > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>💬</span>
                              <span>
                                {inquiries} RFQ{inquiries > 1 ? 's' : ''}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Browsing</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('stream');
                              setEventSearch(country.country);
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold transition"
                          >
                            ⚡ Stream
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                      No country data matches the filter.
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2B. EXPORT CORRIDOR FUNNEL & IPAPI.CO GEO ACCURACY (`BI-07`) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🚢 Export Buyer Funnel &amp; Geo Discrepancies (BI-07)</span>
            </h3>
            <p className="text-xs text-slate-500">
              International export banner views, WhatsApp quote CTR, and server Geo vs client ipapi.co comparison
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono self-start sm:self-auto">
            {exportFunnel?.conversionRate ?? 0}% Export CTR
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Export Banner Views
            </span>
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {exportFunnel?.bannerViews ?? 0}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Export WhatsApp Clicks
            </span>
            <span className="text-xl font-extrabold text-emerald-700 font-mono">
              {exportFunnel?.whatsappClicks ?? 0}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Export Quote Conversion
            </span>
            <span className="text-xl font-extrabold text-blue-700 font-mono">
              {exportFunnel?.conversionRate ?? 0}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Export Corridor Top Countries */}
          <div className="border border-slate-200/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Top Export Markets
            </h4>
            {exportFunnel?.topCountries && exportFunnel.topCountries.length > 0 ? (
              <>
                <div className="block md:hidden space-y-2">
                  {exportFunnel.topCountries.map((c) => (
                    <div
                      key={c.countryCode}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {getCountryFlag(c.countryCode)} {c.country} ({c.countryCode})
                        </span>
                        <span className="font-mono text-xs font-bold text-blue-700">
                          {c.conversionRate}% CTR
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                        <span>{c.bannerViews} views</span>
                        <span className="text-emerald-700 font-semibold">
                          {c.whatsappClicks} WA clicks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Country</th>
                        <th className="py-2 px-3 text-center">Banner Views</th>
                        <th className="py-2 px-3 text-center">WA Clicks</th>
                        <th className="py-2 px-3 text-right">CTR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exportFunnel.topCountries.map((c) => (
                        <tr key={c.countryCode}>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {getCountryFlag(c.countryCode)} {c.country}{' '}
                            <span className="text-slate-400 font-mono">({c.countryCode})</span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono">{c.bannerViews}</td>
                          <td className="py-2 px-3 text-center font-mono text-emerald-700 font-bold">
                            {c.whatsappClicks}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                            {c.conversionRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No international export banner views recorded yet.
              </p>
            )}
          </div>

          {/* Server Geo vs Client ipapi.co Discrepancies */}
          <div className="border border-slate-200/80 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Server Geo vs ipapi.co Country Mismatches
            </h4>
            {exportFunnel?.geoDiscrepancies && exportFunnel.geoDiscrepancies.length > 0 ? (
              <>
                <div className="block md:hidden space-y-2">
                  {exportFunnel.geoDiscrepancies.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-slate-800">
                        Server {d.serverCountryCode} ≠ Client {d.clientCountryCode}
                      </span>
                      <span className="font-mono font-bold text-amber-700">
                        {d.sessions} sess
                      </span>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Server Country</th>
                        <th className="py-2 px-3">Client ipapi.co</th>
                        <th className="py-2 px-3 text-right">Sessions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exportFunnel.geoDiscrepancies.map((d, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-800">
                            {d.serverCountryCode}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold text-blue-700">
                            {d.clientCountryCode}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-700">
                            {d.sessions}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No server vs ipapi.co country discrepancies detected.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. ACQUISITION CHANNELS & TRAFFIC SOURCES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🚦 Acquisition Channels</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Categorized breakdown of inbound buyer channels
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-600 font-semibold">
              {totalSessions} sessions
            </span>
          </div>

          <div className="space-y-3">
            {channelsList.length > 0 ? (
              channelsList.map((ch, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-base">{ch.icon}</span>
                      <span>{ch.name}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {ch.count} sessions{' '}
                      <span className="text-slate-400 font-normal">({ch.pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(ch.pct, 4)}%`, backgroundColor: ch.color }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No session sources captured yet.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🔗 Top Referrer URLs &amp; Domains</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact external referral sources driving traffic
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Top {stats?.topReferrers?.length || 0}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {stats?.topReferrers && stats.topReferrers.length > 0 ? (
              stats.topReferrers.map((ref, idx) => {
                const count = parseInt(ref.count, 10) || 0;
                const pct = Math.round((count / totalSessions) * 100);
                const ch = getChannelCategory(ref.referrer);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs p-2.5 bg-slate-50/70 border border-slate-200/60 rounded-xl hover:bg-slate-100/70 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm">{ch.icon}</span>
                      <span
                        className="font-mono font-medium text-slate-800 truncate"
                        title={ref.referrer}
                      >
                        {ref.referrer}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 ml-3 shrink-0">
                      {count}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No referrer data captured yet.
              </p>
            )}
          </div>

          {stats?.utmCampaigns && stats.utmCampaigns.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                📢 Active UTM Campaigns
              </span>
              <div className="space-y-1.5">
                {stats.utmCampaigns.map((utm, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs font-mono p-2 bg-amber-50/60 border border-amber-200/60 rounded-lg"
                  >
                    <span className="truncate text-amber-900">
                      {utm.utm_campaign || utm.utm_source || 'Campaign'}{' '}
                      <span className="text-[10px] text-amber-600">
                        ({utm.utm_medium || 'medium'})
                      </span>
                    </span>
                    <span className="font-bold text-amber-800">{utm.count} visits</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. HARDWARE & SOFTWARE ECOSYSTEM */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>💻 Technology, Device &amp; Browser Ecosystem</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visitor devices, operating systems, and client software
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Hardware Breakdown</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div>
              <h4 className="text-xs uppercase text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                <span>📱 Device Category</span>
              </h4>
              <div className="space-y-3">
                {stats?.devices?.map((d, i) => {
                  const count = parseInt(d.count, 10) || 0;
                  const pct = Math.round((count / totalDevices) * 100);
                  const icon =
                    d.device_type?.toLowerCase() === 'mobile'
                      ? '📱'
                      : d.device_type?.toLowerCase() === 'tablet'
                      ? '📟'
                      : '💻';
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="capitalize text-slate-700 flex items-center gap-1.5">
                          <span>{icon}</span>
                          <span>{d.device_type}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1 rounded-full"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div>
              <h4 className="text-xs uppercase text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                <span>⚙️ Operating Systems</span>
              </h4>
              <div className="space-y-3">
                {stats?.operatingSystems && stats.operatingSystems.length > 0 ? (
                  stats.operatingSystems.map((os, i) => {
                    const count = parseInt(os.count, 10) || 0;
                    const pct = Math.round((count / totalDevices) * 100);
                    const osName = os.os || 'Other';
                    const icon = osName.toLowerCase().includes('android')
                      ? '🤖'
                      : osName.toLowerCase().includes('ios')
                      ? '🍎'
                      : osName.toLowerCase().includes('win')
                      ? '🪟'
                      : osName.toLowerCase().includes('mac')
                      ? '🍏'
                      : '💻';
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-slate-700 flex items-center gap-1.5 truncate">
                            <span>{icon}</span>
                            <span className="truncate">{osName}</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200/80 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-1 rounded-full"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No OS data captured yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div>
              <h4 className="text-xs uppercase text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                <span>🌐 Web Browsers</span>
              </h4>
              <div className="space-y-3">
                {stats?.browsers?.map((b, i) => {
                  const count = parseInt(b.count, 10) || 0;
                  const pct = Math.round((count / totalDevices) * 100);
                  const bName = b.browser || 'Other';
                  const icon = bName.toLowerCase().includes('chrome')
                    ? '🟢'
                    : bName.toLowerCase().includes('safari')
                    ? '🔵'
                    : bName.toLowerCase().includes('firefox')
                    ? '🟠'
                    : bName.toLowerCase().includes('edge')
                    ? '🔷'
                    : '🌐';
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className="text-slate-700 flex items-center gap-1.5 truncate">
                          <span>{icon}</span>
                          <span className="truncate">{bName}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-purple-600 h-1 rounded-full"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
