import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Check, Circle, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
export const InvestigationRibbon = ({ currentStage = 'explain', aoiLabel = 'Pune Urban Area', centroidCoords = [73.8567, 18.5204], beforeDate, afterDate, candidateCount = 0, verifiedCount = 0 }) => {
    const stages = [
        { key: 'discover', stepNumber: '01', label: 'DISCOVER', caption: 'Copernicus CDSE L2A' },
        { key: 'detect', stepNumber: '02', label: 'DETECT', caption: 'Spectral Differencing' },
        { key: 'explain', stepNumber: '03', label: 'EXPLAIN', caption: 'Candidate Morphology' },
        { key: 'verify', stepNumber: '04', label: 'VERIFY', caption: verifiedCount > 0 ? `${verifiedCount} Verified` : 'Analyst Decision' }
    ];
    const getStageState = (stageKey) => {
        const order = ['discover', 'detect', 'explain', 'verify'];
        const currentIndex = order.indexOf(currentStage);
        const stageIndex = order.indexOf(stageKey);
        if (stageIndex < currentIndex)
            return 'completed';
        if (stageIndex === currentIndex)
            return 'current';
        return 'pending';
    };
    return (_jsx("div", { className: "bg-white border border-slate-200 rounded-md p-2.5 shadow-2xs", children: _jsxs("div", { className: "flex flex-col lg:flex-row lg:items-center justify-between gap-3", children: [_jsx("div", { className: "flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-0.5", children: stages.map((stage, index) => {
                        const state = getStageState(stage.key);
                        const isLast = index === stages.length - 1;
                        return (_jsxs(React.Fragment, { children: [_jsxs("div", { className: `flex items-center space-x-2 px-2.5 py-1 rounded transition-colors shrink-0 ${state === 'current'
                                        ? 'bg-teal-50 border border-teal-200'
                                        : state === 'completed'
                                            ? 'bg-slate-50 text-slate-700'
                                            : 'text-slate-400'}`, children: [_jsx("div", { className: `w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 font-bold ${state === 'completed'
                                                ? 'bg-emerald-600 text-white'
                                                : state === 'current'
                                                    ? 'bg-teal-800 text-white'
                                                    : 'border border-slate-300 text-slate-400 bg-white'}`, children: state === 'completed' ? (_jsx(Check, { className: "w-2.5 h-2.5 stroke-[3]" })) : state === 'current' ? (_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-white animate-ping" })) : (_jsx(Circle, { className: "w-2 h-2 text-slate-300" })) }), _jsxs("div", { className: "leading-tight", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx("span", { className: `text-[10px] font-mono font-semibold ${state === 'current' ? 'text-teal-900' : state === 'completed' ? 'text-slate-700' : 'text-slate-400'}`, children: stage.stepNumber }), _jsx("span", { className: `text-[11px] font-bold tracking-wider ${state === 'current' ? 'text-teal-950' : state === 'completed' ? 'text-slate-800' : 'text-slate-400'}`, children: stage.label }), state === 'current' && (_jsx("span", { className: "text-[9px] font-mono uppercase bg-teal-800 text-white px-1 py-0.2 rounded font-medium", children: "Active" }))] }), _jsx("div", { className: "text-[9px] text-slate-500 font-mono truncate max-w-[130px]", children: stage.caption })] })] }), !isLast && (_jsx("div", { className: "text-slate-300 font-mono text-xs shrink-0 select-none", children: "\u2500\u2500\u2500\u25BA" }))] }, stage.key));
                    }) }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 text-xs font-mono shrink-0", children: [_jsxs("div", { className: "flex items-center space-x-1 text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200", children: [_jsx(MapPin, { className: "w-3 h-3 text-teal-800" }), _jsx("span", { className: "font-semibold text-slate-800 font-sans", children: aoiLabel }), _jsxs("span", { className: "text-slate-400 text-[10px]", children: ["(", centroidCoords[1].toFixed(4), "\u00B0 N, ", centroidCoords[0].toFixed(4), "\u00B0 E)"] })] }), (beforeDate || afterDate) && (_jsxs("div", { className: "flex items-center space-x-1 text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200", children: [_jsx(Calendar, { className: "w-3 h-3 text-teal-800" }), _jsxs("span", { children: [beforeDate ? format(new Date(beforeDate), 'dd MMM yyyy') : 'Baseline', ' ', "\u2192", ' ', afterDate ? format(new Date(afterDate), 'dd MMM yyyy') : 'Monitor'] })] })), candidateCount > 0 && (_jsxs("div", { className: "px-2 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[11px]", children: [candidateCount, " Change Candidates"] }))] })] }) }));
};
export default InvestigationRibbon;
