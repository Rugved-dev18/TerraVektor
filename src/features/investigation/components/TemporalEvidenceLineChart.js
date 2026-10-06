import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
export const TemporalEvidenceLineChart = ({ observationsSequence, candidateId, activeDate, onHoverDate, className = '' }) => {
    const [metricMode, setMetricMode] = useState('indices');
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
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (_jsxs("div", { className: "bg-white/95 backdrop-blur-xs border border-slate-300 rounded p-2 text-xs shadow-md font-mono space-y-1.5 z-50 min-w-[190px]", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 pb-1 text-[10px] text-slate-500", children: [_jsx("span", { className: "font-semibold text-slate-800", children: data.full_date || data.date }), _jsx("span", { className: "text-teal-800 font-medium", children: data.platform })] }), _jsxs("div", { className: "space-y-1 text-[11px]", children: [_jsxs("div", { className: "flex items-center justify-between space-x-2 text-emerald-800", children: [_jsxs("span", { className: "flex items-center space-x-1", children: [_jsx("span", { className: "w-2 h-2 rounded-xs bg-emerald-600 inline-block" }), _jsx("span", { children: "NDVI (Veg):" })] }), _jsxs("span", { className: "font-bold", children: [data.usable ? (metricMode === 'indices' ? data.ndvi : (data.delta_ndvi >= 0 ? `+${data.delta_ndvi}` : data.delta_ndvi)) : 'Cloudy', data.usable && metricMode === 'indices' && data.delta_ndvi !== undefined && (_jsxs("span", { className: "text-[9px] text-slate-500 font-normal ml-1", children: ["(\u0394", data.delta_ndvi >= 0 ? `+${data.delta_ndvi}` : data.delta_ndvi, ")"] }))] })] }), _jsxs("div", { className: "flex items-center justify-between space-x-2 text-amber-800", children: [_jsxs("span", { className: "flex items-center space-x-1", children: [_jsx("span", { className: "w-2 h-2 rounded-xs bg-amber-600 inline-block" }), _jsx("span", { children: "NDBI (Built):" })] }), _jsxs("span", { className: "font-bold", children: [data.usable ? (metricMode === 'indices' ? data.ndbi : (data.delta_ndbi >= 0 ? `+${data.delta_ndbi}` : data.delta_ndbi)) : 'Cloudy', data.usable && metricMode === 'indices' && data.delta_ndbi !== undefined && (_jsxs("span", { className: "text-[9px] text-slate-500 font-normal ml-1", children: ["(\u0394", data.delta_ndbi >= 0 ? `+${data.delta_ndbi}` : data.delta_ndbi, ")"] }))] })] })] }), _jsxs("div", { className: "pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500", children: [_jsxs("span", { children: ["Cloud: ", data.cloud_cover.toFixed(1), "%"] }), _jsx("span", { className: `font-bold uppercase ${!data.usable
                                    ? 'text-slate-400'
                                    : data.change_signal === 'changed'
                                        ? 'text-amber-700'
                                        : data.change_signal === 'baseline'
                                            ? 'text-emerald-700'
                                            : data.change_signal === 'reversal'
                                                ? 'text-sky-700'
                                                : 'text-slate-600'}`, children: data.usable ? data.change_signal : 'Masked (Cloud)' })] })] }));
        }
        return null;
    };
    return (_jsxs("div", { className: `bg-white border border-slate-200 rounded p-2.5 space-y-2 select-none ${className}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx(TrendingUp, { className: "w-3.5 h-3.5 text-teal-800" }), _jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-800 font-mono", children: "SPECTRAL INDEX TRAJECTORY" }), _jsxs("span", { className: "text-[9px] text-slate-400 font-mono hidden sm:inline", children: ["\u2022 ", candidateId] })] }), _jsxs("div", { className: "flex items-center p-0.5 bg-slate-100 rounded text-[10px] font-mono", children: [_jsx("button", { type: "button", onClick: () => setMetricMode('indices'), className: `px-2 py-0.5 rounded transition-colors font-medium ${metricMode === 'indices'
                                    ? 'bg-white text-teal-950 shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900'}`, children: "Values" }), _jsx("button", { type: "button", onClick: () => setMetricMode('deltas'), className: `px-2 py-0.5 rounded transition-colors font-medium ${metricMode === 'deltas'
                                    ? 'bg-white text-teal-950 shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900'}`, children: "\u0394 Relative" })] })] }), _jsx("div", { className: "w-full h-[180px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: chartData, margin: { top: 8, right: 12, left: -22, bottom: 4 }, onMouseMove: (e) => {
                            if (e?.activePayload?.[0]?.payload?.date && onHoverDate) {
                                onHoverDate(e.activePayload[0].payload.date);
                            }
                        }, onMouseLeave: () => {
                            if (onHoverDate)
                                onHoverDate(null);
                        }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#f1f5f9", vertical: false }), _jsx(XAxis, { dataKey: "date", tickLine: false, axisLine: { stroke: '#cbd5e1' }, tick: { fontSize: 9, fill: '#64748b', fontFamily: 'monospace' } }), _jsx(YAxis, { domain: yDomain, tickLine: false, axisLine: { stroke: '#cbd5e1' }, tick: { fontSize: 9, fill: '#64748b', fontFamily: 'monospace' }, tickFormatter: (v) => v.toFixed(1) }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(ReferenceLine, { y: 0, stroke: "#cbd5e1", strokeDasharray: "2 2" }), _jsx(Line, { type: "monotone", dataKey: metricMode === 'indices' ? 'ndvi' : 'delta_ndvi', name: metricMode === 'indices' ? 'NDVI (Vegetation)' : '\u0394 NDVI (Veg Change)', stroke: "#059669", strokeWidth: 2, connectNulls: true, dot: (props) => {
                                    const { cx, cy, payload } = props;
                                    if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy))
                                        return null;
                                    const isHovered = activeDate && (payload.date === activeDate || payload.full_date === activeDate);
                                    return (_jsx("circle", { cx: cx, cy: cy, r: isHovered ? 5.5 : 3.5, fill: payload.usable ? '#059669' : '#ffffff', stroke: "#059669", strokeWidth: payload.usable ? 1.5 : 1, strokeDasharray: payload.usable ? undefined : '2 2' }, `ndvi-${payload.date}`));
                                }, activeDot: { r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 } }), _jsx(Line, { type: "monotone", dataKey: metricMode === 'indices' ? 'ndbi' : 'delta_ndbi', name: metricMode === 'indices' ? 'NDBI (Built-up)' : '\u0394 NDBI (Built Change)', stroke: "#d97706", strokeWidth: 2, connectNulls: true, dot: (props) => {
                                    const { cx, cy, payload } = props;
                                    if (cx === undefined || cy === undefined || isNaN(cx) || isNaN(cy))
                                        return null;
                                    const isHovered = activeDate && (payload.date === activeDate || payload.full_date === activeDate);
                                    return (_jsx("circle", { cx: cx, cy: cy, r: isHovered ? 5.5 : 3.5, fill: payload.usable ? '#d97706' : '#ffffff', stroke: "#d97706", strokeWidth: payload.usable ? 1.5 : 1, strokeDasharray: payload.usable ? undefined : '2 2' }, `ndbi-${payload.date}`));
                                }, activeDot: { r: 6, fill: '#d97706', stroke: '#ffffff', strokeWidth: 2 } })] }) }) }), _jsxs("div", { className: "flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] font-mono text-slate-600", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("span", { className: "w-2.5 h-0.5 bg-emerald-600 inline-block" }), _jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" }), _jsx("span", { className: "text-emerald-900 font-semibold", children: "NDVI" }), _jsx("span", { className: "text-[9px] text-slate-400 font-normal", children: "Veg" })] }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("span", { className: "w-2.5 h-0.5 bg-amber-600 inline-block" }), _jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-600 inline-block" }), _jsx("span", { className: "text-amber-900 font-semibold", children: "NDBI" }), _jsx("span", { className: "text-[9px] text-slate-400 font-normal", children: "Built" })] })] }), _jsx("div", { className: "text-[9px] text-slate-400 flex items-center space-x-1", children: _jsx("span", { children: "\u2014 y=0 Neutral" }) })] })] }));
};
