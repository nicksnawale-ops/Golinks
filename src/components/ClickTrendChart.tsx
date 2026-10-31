import React, { useEffect, useState } from 'react';
import { LineChart as LineChartIcon } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { DailyClicks } from '../services/linkService';
import { formatNumber } from '../utils/formatters';

interface ClickTrendChartProps {
  title: string;
  subtitle?: string;
  /** Loads the series; called once on mount and whenever `reloadKey` changes. */
  load: () => Promise<DailyClicks[]>;
  reloadKey?: unknown;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** 30-day clicks area chart, used on the dashboard and on each link's details page. */
export const ClickTrendChart: React.FC<ClickTrendChartProps> = ({ title, subtitle, load, reloadKey }) => {
  const { isDark } = useTheme();
  const [data, setData] = useState<DailyClicks[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    load()
      .then((series) => !cancelled && setData(series))
      .catch((err) => !cancelled && setError((err as Error).message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const total = data?.reduce((sum, d) => sum + d.clicks, 0) ?? 0;
  const axis = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{title}</span>
          </h2>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {data && (
          <div className="text-right">
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">{formatNumber(total)}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">clicks, last {data.length} days</div>
          </div>
        )}
      </div>

      <div className="h-56 w-full">
        {error ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">Couldn't load click history: {error}</div>
        ) : !data ? (
          <div className="h-full rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ) : total === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500 text-center px-6">
            No clicks recorded in this period yet. History starts from this update, so it fills in as people use links.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="clickTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fill: axis, fontSize: 11 }}
                minTickGap={24}
                tickLine={false}
              />
              <YAxis allowDecimals={false} tick={{ fill: axis, fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as DailyClicks;
                  return (
                    <div className="p-3 bg-slate-900 text-white rounded-lg shadow-xl text-xs space-y-1 border border-slate-700">
                      <div className="font-semibold">{shortDate(d.date)}</div>
                      <div>{formatNumber(d.clicks)} clicks</div>
                      <div className="text-slate-400">{formatNumber(d.uniqueUsers)} signed-in people</div>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="clicks" stroke="#2563EB" strokeWidth={2} fill="url(#clickTrendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
