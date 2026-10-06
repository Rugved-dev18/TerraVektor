import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Menu, X, Compass } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Dashboard from '../pages/Dashboard';
import SemanticSearch from '../pages/SemanticSearch';
import ImageSearch from '../pages/ImageSearch';
import ChangeAnalysis from '../pages/ChangeAnalysis';
import SimilarLocations from '../pages/SimilarLocations';
import ReviewQueue from '../pages/ReviewQueue';
import DataManagement from '../pages/DataManagement';
import SystemStatus from '../pages/SystemStatus';
import Sentinel2Search from '../pages/Sentinel2Search';
import { getHealth, isExplicitDemoModeActive, setExplicitDemoMode } from '../services/api';
function App() {
    const [currentPage, setCurrentPage] = useState('semantic-search');
    const [healthStatus, setHealthStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(isExplicitDemoModeActive());
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    useEffect(() => {
        checkHealth();
    }, [isDemoMode]);
    const toggleDemoMode = () => {
        const next = !isDemoMode;
        setIsDemoMode(next);
        setExplicitDemoMode(next);
    };
    const checkHealth = async () => {
        try {
            const health = await getHealth();
            setHealthStatus(health);
        }
        catch (error) {
            console.error('Health check failed:', error);
        }
        finally {
            setIsLoading(false);
        }
    };
    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return _jsx(Dashboard, { onNavigate: (page) => setCurrentPage(page) });
            case 'sentinel2-search':
                return _jsx(Sentinel2Search, {});
            case 'semantic-search':
                return _jsx(SemanticSearch, {});
            case 'image-search':
                return _jsx(ImageSearch, {});
            case 'change-analysis':
                return _jsx(ChangeAnalysis, {});
            case 'similar-locations':
                return _jsx(SimilarLocations, {});
            case 'review-queue':
                return _jsx(ReviewQueue, {});
            case 'data':
                return _jsx(DataManagement, {});
            case 'status':
                return _jsx(SystemStatus, { healthStatus: healthStatus });
            default:
                return _jsx(SemanticSearch, {});
        }
    };
    const isUpstreamDown = !healthStatus?.cdse_connected || healthStatus?.data_mode === 'upstream_unavailable';
    return (_jsxs("div", { className: "flex h-screen bg-[#f8f9fa] text-slate-800 antialiased font-sans", children: [_jsx(Sidebar, { currentPage: currentPage, onPageChange: (page) => setCurrentPage(page), healthStatus: healthStatus, isOpen: mobileMenuOpen, onCloseMobile: () => setMobileMenuOpen(false) }), _jsxs("main", { className: "flex-1 flex flex-col overflow-hidden bg-[#f4f6f8] min-w-0", children: [_jsx("header", { className: "bg-white border-b border-slate-200 px-4 py-2.5 shadow-2xs shrink-0 select-none", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-2.5 min-w-0", children: [_jsx("button", { type: "button", onClick: () => setMobileMenuOpen(!mobileMenuOpen), className: "p-1 rounded lg:hidden text-slate-600 hover:text-slate-900 hover:bg-slate-100", "aria-label": "Toggle navigation menu", children: mobileMenuOpen ? _jsx(X, { className: "w-4 h-4" }) : _jsx(Menu, { className: "w-4 h-4" }) }), _jsx("div", { className: "w-6 h-6 bg-teal-800 rounded flex items-center justify-center text-white shadow-xs shrink-0 lg:hidden", children: _jsx(Compass, { className: "w-3.5 h-3.5" }) }), _jsx("div", { className: "min-w-0", children: _jsxs("h1", { className: "text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5 truncate", children: [_jsx("span", { children: "TERRAVEKTOR" }), _jsx("span", { className: "text-slate-300 font-normal", children: "\u2022" }), _jsx("span", { className: "text-[11px] text-teal-800 font-mono font-medium truncate", children: "Geospatial Investigation Cockpit" })] }) })] }), _jsxs("div", { className: "flex items-center space-x-2.5 shrink-0 text-xs", children: [healthStatus && (_jsxs("div", { className: "hidden sm:flex items-center space-x-1.5 text-[11px] font-mono text-slate-600", children: [_jsx("span", { className: `w-1.5 h-1.5 rounded-full ${healthStatus.status === 'healthy' && !isUpstreamDown ? 'bg-emerald-500' : 'bg-red-500'}` }), _jsx("span", { children: healthStatus.status === 'healthy' && !isUpstreamDown ? 'CDSE Live' : 'CDSE Degraded' })] })), isDemoMode || healthStatus?.data_mode === 'demo_data' ? (_jsxs("div", { className: "flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-600" }), _jsx("span", { children: "DEMO MODE" })] })) : isUpstreamDown ? (_jsxs("div", { className: "flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-900 border border-rose-300", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-rose-600" }), _jsx("span", { children: "UPSTREAM OFFLINE" })] })) : (_jsxs("div", { className: "flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-900 border border-teal-300", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-teal-700 animate-pulse" }), _jsx("span", { children: "LIVE SENTINEL-2" })] })), _jsx("button", { onClick: toggleDemoMode, title: isDemoMode ? 'Switch to Live Copernicus CDSE queries' : 'Toggle Demo Mode for offline simulation', className: `text-[11px] px-2 py-0.5 rounded border font-medium transition-colors ${isDemoMode
                                                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`, children: isDemoMode ? 'Exit Demo' : 'Demo Mode' })] })] }) }), _jsx("div", { className: "flex-1 flex overflow-hidden", children: _jsx("div", { className: "flex-1 overflow-auto", children: renderPage() }) })] })] }));
}
export default App;
