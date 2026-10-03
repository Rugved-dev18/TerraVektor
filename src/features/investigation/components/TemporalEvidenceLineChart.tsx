import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { TrendingUp, Activity, Layers, Info } from 'lucide-react';
import { TemporalObservationEvidence } from '../../../types';

interface TemporalEvidenceLineChartProps {
  observationsSequence: TemporalObservationEvidence[];
  candidateId: string;
  activeDate?: string | null;
  onHoverDate?: (date: string | null) => void;
  className?: string;
}

export const TemporalEvidenceLineChart: React.FC<TemporalEvidenceLineChartProps> = ({
  observationsSequence,
  candidateId,
  activeDate,
  onHoverDate,
  className = ''
}) => {
  const [metricMode, setMetricMode] = useState<'indices' | 'deltas'>('indices');

  // Prepare chart dataset
  const chartData = useMemo(() => {
    return observationsSequence.map((obs, idx) => {
      const isUsable = obs.usable;
      return {
        index: idx + 1,
        date: obs.date, // e.g. "2024-05"
        full_date: obs.full_date, // e.g. "2024-05-28"
        platform: obs.platform || 'Sentinel-2',
        cloud_cover: obs.cloud_cover ?? 0,
        usable: isUsable,
        change_signal: obs.change_signal || (idx === 0 ? 'baseline' : 'observation'),
        // Index values (NDVI: Vegetation, NDBI: Built-up)
        ndvi: isUsable ? Number(obs.ndvi.toFixed(3)) : null,
        ndbi: isUsable ? Number(obs.ndbi.toFixed(3)) : null,
        // Delta from baseline
        delta_ndvi: isUsable ? Number((obs.delta_ndvi ?? 0).toFixed(3)) : null,
        delta_ndbi: isUsable ? Number((obs.delta_ndbi ?? 0).toFixed(3)) : null,
        // Raw values for tooltip even if delta mode
        raw_ndvi: obs.ndvi,
        raw_ndbi: obs.ndbi
      };
    });
  }, [observationsSequence]);

  // Compute dynamic domain bounds for stability
  const yDomain = useMemo(() => {
    if (metricMode === 'deltas') {
      return [-0.5, 0.5];
    }
    // For raw indices, NDVI typically -0.2 to 0.8, NDBI -0.4 to 0.4
    return [-0.5, 0.8];
  }, [metricMode]);

  // Custom interactive tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-xs border border-slate-300 rounded p-2 text-xs shadow-md font-mono space-y-1.5 z-50 min-w-[190px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1 text-[10px] text-slate-500">
            <span className="font-semibold text-slate-800">{data.full_date || data.date}</span>
            <span className="text-teal-800 font-medium">{data.platform}</span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between space-x-2 text-emerald-800">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-xs bg-emerald-600 inline-block" />
                <span>NDVI (Veg):</span>
              </span>
              <span className="font-bold">
                {data.usable ? (metricMode === 'indices' ? data.ndvi : (data.delta_ndvi >= 0 ? `+${data.delta_ndvi}` : data.delta_ndvi)) : 'Cloudy'}
                {data.usable && metricMode === 'indices' && data.delta_ndvi !== undefined && (
                  <span className="text-[9px] text-slate-500 font-normal ml-1">
                    (&Delta;{data.delta_ndvi >= 0 ? `+${data.delta_ndvi}` : data.delta_ndvi})
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between space-x-2 text-amber-800">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-xs bg-amber-600 inline-block" />
                <span>NDBI (Built):</span>
              </span>
              <span className="font-bold">
                {data.usable ? (metricMode === 'indices' ? data.ndbi : (data.delta_ndbi >= 0 ? `+${data.delta_ndbi}` : data.delta_ndbi)) : 'Cloudy'}
                {data.usable && metricMode === 'indices' && data.delta_ndbi !== undefined && (
                  <span className="text-[9px] text-slate-500 font-normal ml-1">
                    (&Delta;{data.delta_ndbi >= 0 ? `+${data.delta_ndbi}` : data.delta_ndbi})
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500">
            <span>Cloud: {data.cloud_cover.toFixed(1)}%</span>
            <span className={`font-bold uppercase ${
              !data.usable
                ? 'text-slate-400'
                : data.change_signal === 'changed'
                ? 'text-amber-700'
                : data.change_signal === 'baseline'
                ? 'text-emerald-700'
                : data.change_signal === 'reversal'
                ? 'text-sky-700'
                : 'text-slate-600'
            }`}>
              {data.usable ? data.change_signal : 'Masked (Cloud)'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white border border-slate-200 rounded p-2.5 space-y-2 select-none ${className}`}>
      {/* Chart Header with Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-teal-800" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 font-mono">
            SPECTRAL INDEX TRAJECTORY
          </span>
          <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">
            &bull; {candidateId}
          </span>
        </div>

        {/* Segmented Control for Metric Mode */}
        <div className="flex items-center p-0.5 bg-slate-100 rounded text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setMetricMode('indices')}
            className={`px-2 py-0.5 rounded transition-colors font-medium ${
              metricMode === 'indices'
                ? 'bg-white text-teal-950 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Values
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('deltas')}
            className={`px-2 py-0.5 rounded transition-colors font-medium ${
              metricMode === 'deltas'
                ? 'bg-white text-teal-950 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            &Delta; Relative
          </button>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="w-full h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 12, left: -22, bottom: 4 }}
            onMouseMove={(e: any) => {
              if (e?.activePayload?.[0]?.payload?.date && onHoverDate) {
                onHoverDate(e.activePayload[0].payload.date);
              }
            }}
            onMouseLeave={() => {
              if (onHoverDate) onHoverDate(null);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }}
            />
            <YAxis
              domain={yDomain}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Neutral baseline reference line */}
            <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="2 2" />

            {/* NDVI line: Emerald Green */}
            <Line
              type="monotone"
              dataKey={metricMode === 'indices' ? 'ndvi' : 'delta_ndvi'}
              name={metricMode === 'indices' ? 'NDVI (Vegetation)' : '\u0394 NDVI (Veg Change)'}
              stroke="#059669"
              strokeWidth={2}
              connectNulls
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) return null;
                const isHovered = activeDate && (payload.date === activeDate || payload.full_date === activeDate);
                return (
                  <circle
                    key={`ndvi-${payload.date}`}
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5.5 : 3.5}
                    fill={payload.usable ? '#059669' : '#ffffff'}
                    stroke="#059669"
                    strokeWidth={payload.usable ? 1.5 : 1}
                    strokeDasharray={payload.usable ? undefined : '2 2'}
                  />
                );
              }}
              activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
            />

            {/* NDBI line: Amber / Orange */}
            <Line
              type="monotone"
              dataKey={metricMode === 'indices' ? 'ndbi' : 'delta_ndbi'}
              name={metricMode === 'indices' ? 'NDBI (Built-up)' : '\u0394 NDBI (Built Change)'}
              stroke="#d97706"
              strokeWidth={2}
              connectNulls
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy)) return null;
                const isHovered = activeDate && (payload.date === activeDate || payload.full_date === activeDate);
                return (
                  <circle
                    key={`ndbi-${payload.date}`}
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5.5 : 3.5}
                    fill={payload.usable ? '#d97706' : '#ffffff'}
                    stroke="#d97706"
                    strokeWidth={payload.usable ? 1.5 : 1}
                    strokeDasharray={payload.usable ? undefined : '2 2'}
                  />
                );
              }}
              activeDot={{ r: 6, fill: '#d97706', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Interpretation Guide */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] font-mono text-slate-600">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-emerald-600 inline-block" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
            <span className="text-emerald-900 font-semibold">NDVI</span>
            <span className="text-[9px] text-slate-400 font-normal">Veg</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-amber-600 inline-block" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block" />
            <span className="text-amber-900 font-semibold">NDBI</span>
            <span className="text-[9px] text-slate-400 font-normal">Built</span>
          </div>
        </div>

        <div className="text-[9px] text-slate-400 flex items-center space-x-1">
          <span>&mdash; y=0 Neutral</span>
        </div>
      </div>
    </div>
  );
};
