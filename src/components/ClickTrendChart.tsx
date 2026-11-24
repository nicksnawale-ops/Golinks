import React, { useEffect, useState } from 'react';
import { LineChart as LineChartIcon } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DailyClicks } from '../services/linkService';
import { formatNumber } from '../utils/formatters';
import { GhostTrendLine } from './live/EmptyStateArt';

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
  const axis = '#6B7485';

  return (
    <div className="bg-white border border-ve-gray-200 rounded-xl p-6 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ve-gray-900 flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-ve-blue" />
            <span>{title}</span>
          </h2>
          {subtitle && <p className="text-xs text-ve-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {data && (
          <div className="text-right">
            <div className="text-lg font-bold font-mono tabular-nums text-ve-gray-900">{formatNumber(total)}</div>
            <div className="text-[11px] text-ve-gray-500">clicks, last {data.length} days</div>
          </div>
        )}
      </div>

      <div className="h-56 w-full">
        {error ? (
          <div className="h-full flex items-center justify-center text-sm text-ve-gray-500">Couldn't load click history: {error}</div>
        ) : !data ? (
          <div className="h-full rounded-lg bg-ve-gray-100 animate-pulse" />
        ) : total === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-sm text-ve-gray-500 text-center px-6">
            <GhostTrendLine />
            No clicks in this period yet. Daily clicks appear here as people open go links.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="clickTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E63FF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#1E63FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={'#EEF1F6'} />
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
                    <div className="p-3 bg-ve-gray-800 text-white rounded-md shadow-md text-xs space-y-1 ">
                      <div className="font-semibold">{shortDate(d.date)}</div>
                      <div>{formatNumber(d.clicks)} clicks</div>
                      <div className="text-ve-gray-400">{formatNumber(d.uniqueUsers)} signed-in people</div>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="clicks" stroke="#1E63FF" strokeWidth={2} fill="url(#clickTrendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
