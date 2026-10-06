import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Satellite, Compass, Search, MapPin, Database, Activity, ClipboardCheck, ImageIcon, Settings, ShieldCheck, AlertCircle } from 'lucide-react';
export const Sidebar = ({ currentPage, onPageChange, healthStatus, isOpen = true, onCloseMobile }) => {
    const sections = [
        {
            title: 'WORKSPACE',
            items: [
                { id: 'dashboard', label: 'Overview', icon: Satellite },
                { id: 'sentinel2-search', label: 'Discover', icon: Compass },
                { id: 'semantic-search', label: 'Investigate', icon: Search, badge: 'Active' },
                { id: 'similar-locations', label: 'Compare', icon: MapPin },
            ]
        },
        {
            title: 'DATA',
            items: [
                { id: 'data', label: 'Scenes Archive', icon: Database },
            ]
        },
        {
            title: 'ANALYSIS',
            items: [
                { id: 'change-analysis', label: 'Change Analysis', icon: Activity },
                { id: 'review-queue', label: 'Review Queue', icon: ClipboardCheck },
                { id: 'image-search', label: 'Visual Search', icon: ImageIcon },
            ]
        },
        {
            title: 'SYSTEM',
            items: [
                { id: 'status', label: 'System Status', icon: Settings },
            ]
        }
    ];
    const isHealthy = healthStatus?.status === 'healthy';
    const isCdseOnline = healthStatus?.cdse_connected;
    return (_jsxs(_Fragment, { children: [isOpen && onCloseMobile && (_jsx("div", { onClick: onCloseMobile, className: "fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden" })), _jsxs("aside", { className: `
        fixed lg:static top-0 bottom-0 left-0 z-50
        w-[218px] bg-white border-r border-slate-200 flex flex-col shrink-0 select-none
        transition-transform duration-200 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `, children: [_jsx("div", { className: "px-4 py-3 border-b border-slate-200 bg-slate-50/60", children: _jsxs("div", { className: "flex items-center space-x-2.5", children: [_jsx("div", { className: "w-6 h-6 bg-teal-800 rounded flex items-center justify-center text-white shadow-xs shrink-0", children: _jsx(Compass, { className: "w-3.5 h-3.5" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-[13px] font-bold text-slate-900 tracking-tight leading-none flex items-center gap-1.5", children: _jsx("span", { children: "TERRAVEKTOR" }) }), _jsx("div", { className: "text-[10px] text-teal-800 font-mono tracking-tight font-medium mt-0.5 truncate", children: "Geospatial Intelligence" })] })] }) }), _jsx("nav", { className: "flex-1 px-2.5 py-2.5 space-y-3.5 overflow-y-auto", children: sections.map((section) => (_jsxs("div", { className: "space-y-0.5", children: [_jsx("div", { className: "px-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono", children: section.title }), _jsx("div", { className: "space-y-0.5", children: section.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = currentPage === item.id;
                                        return (_jsxs("button", { onClick: () => {
                                                onPageChange(item.id);
                                                if (onCloseMobile)
                                                    onCloseMobile();
                                            }, className: `w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors text-xs group ${isActive
                                                ? 'bg-teal-50/80 text-teal-950 font-semibold border-l-2 border-teal-800 shadow-2xs'
                                                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium'}`, children: [_jsxs("div", { className: "flex items-center space-x-2 min-w-0", children: [_jsx(Icon, { className: `w-3.5 h-3.5 shrink-0 ${isActive ? 'text-teal-800' : 'text-slate-400 group-hover:text-slate-600'}` }), _jsx("span", { className: "truncate", children: item.label })] }), item.badge && !isActive && (_jsx("span", { className: "text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-normal", children: item.badge })), isActive && (_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-teal-700 shrink-0" }))] }, item.id));
                                    }) })] }, section.title))) }), _jsx("div", { className: "p-2.5 border-t border-slate-200 bg-slate-50/80", children: _jsxs("div", { className: "p-2 rounded bg-white border border-slate-200 shadow-2xs", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [isHealthy && isCdseOnline ? (_jsx(ShieldCheck, { className: "w-3.5 h-3.5 text-emerald-600" })) : (_jsx(AlertCircle, { className: "w-3.5 h-3.5 text-amber-600" })), _jsx("span", { className: "text-[10px] font-semibold text-slate-800 tracking-tight", children: isHealthy && isCdseOnline ? 'Copernicus CDSE' : 'CDSE Degraded' })] }), _jsx("span", { className: `w-1.5 h-1.5 rounded-full ${isHealthy && isCdseOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}` })] }), _jsxs("div", { className: "mt-1 flex items-center justify-between text-[9px] text-slate-500 font-mono", children: [_jsx("span", { children: "Sentinel-2 L2A" }), _jsx("span", { children: "10m BOA Grid" })] })] }) })] })] }));
};
export default Sidebar;
