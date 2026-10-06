import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Activity, Calendar, Cloud, MapPin, Loader2, AlertTriangle, Database, Info, ExternalLink, CheckCircle2, FileDown } from 'lucide-react';
import { searchSentinel2, analyzeSentinel2Change, getSentinel2PreviewUrl, getChangeMaskUrl } from '../services/api';
import { SatelliteInvestigationMap } from '../features/investigation/components/SatelliteInvestigationMap';
import { exportAnalysisPdf } from '../utils/exportAnalysisPdf';
import { format } from 'date-fns';
export const ChangeAnalysis = () => {
    const [availableProducts, setAvailableProducts] = useState([]);
    const [beforeProductId, setBeforeProductId] = useState(null);
    const [afterProductId, setAfterProductId] = useState(null);
    const [aoiBbox, setAoiBbox] = useState([73.70, 18.40, 74.05, 18.70]); // Default Pune AOI
    const [startDate, setStartDate] = useState('2024-01-01');
    const [endDate, setEndDate] = useState('2024-12-31');
    const [maxCloudCover, setMaxCloudCover] = useState(30);
    const [isSearching, setIsSearching] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [activeView, setActiveView] = useState('before');
    const [changeMaskOpacity, setChangeMaskOpacity] = useState(0.7);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);
    const handleExportPdf = () => {
        if (!analysisResult)
            return;
        setIsExportingPdf(true);
        try {
            exportAnalysisPdf({
                analysis: analysisResult,
                beforeProduct,
                afterProduct,
                aoiBbox,
                locationName: 'Pune Urban Region'
            });
            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 3000);
        }
        catch (err) {
            console.error('Failed to export analysis PDF summary:', err);
        }
        finally {
            setIsExportingPdf(false);
        }
    };
    // Load available Sentinel-2 products on mount
    useEffect(() => {
        handleSearchSentinel2();
    }, []);
    const handleSearchSentinel2 = async () => {
        if (!aoiBbox)
            return;
        setIsSearching(true);
        setErrorMessage(null);
        try {
            const response = await searchSentinel2({
                bbox: aoiBbox,
                start_date: startDate,
                end_date: endDate,
                max_cloud_cover: maxCloudCover,
                product_type: 'S2MSI2A',
                limit: 50,
                force_refresh: false
            });
            setAvailableProducts(response.results);
            // Auto-select two products with different dates if available
            if (response.results.length >= 2) {
                const sortedByDate = [...response.results].sort((a, b) => new Date(a.acquisition_date).getTime() - new Date(b.acquisition_date).getTime());
                setBeforeProductId(sortedByDate[0].id);
                setAfterProductId(sortedByDate[sortedByDate.length - 1].id);
            }
        }
        catch (err) {
            console.error('Sentinel-2 search failed:', err);
            setErrorMessage(err.response?.data?.detail || err.message || 'Failed to search Sentinel-2 imagery');
        }
        finally {
            setIsSearching(false);
        }
    };
    const handleRunAnalysis = async () => {
        if (!beforeProductId || !afterProductId)
            return;
        setIsAnalyzing(true);
        setErrorMessage(null);
        setAnalysisResult(null);
        try {
            const result = await analyzeSentinel2Change(beforeProductId, afterProductId, aoiBbox || undefined, 'ndvi_differencing');
            setAnalysisResult(result);
            setActiveView('change');
        }
        catch (err) {
            console.error('Change analysis failed:', err);
            setErrorMessage(err.response?.data?.detail || err.message || 'Change analysis failed');
        }
        finally {
            setIsAnalyzing(false);
        }
    };
    const beforeProduct = availableProducts.find(p => p.id === beforeProductId);
    const afterProduct = availableProducts.find(p => p.id === afterProductId);
    const getDataModeBadge = (mode) => {
        if (mode === 'live_copernicus' || mode === 'real_sentinel2') {
            return (_jsxs("span", { className: "px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" }), "Live"] }));
        }
        else if (mode === 'cached') {
            return (_jsxs("span", { className: "px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-yellow-400" }), "Cached"] }));
        }
        else if (mode === 'upstream_unavailable' || mode === 'processing_unavailable') {
            return (_jsxs("span", { className: "px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-rose-400" }), "Unavailable"] }));
        }
        else {
            return (_jsxs("span", { className: "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-400" }), "Demo"] }));
        }
    };
    return (_jsxs("div", { className: "p-6 space-y-6 max-w-7xl mx-auto", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1 font-mono", children: [_jsx(Activity, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Bi-Temporal Surface Monitoring" })] }), _jsx("h1", { className: "text-xl font-bold text-slate-900 tracking-tight", children: "Sentinel-2 Change Analysis" }), _jsx("p", { className: "text-xs text-slate-600 mt-0.5", children: "Multi-spectral NDVI and NDBI surface differencing across paired Sentinel-2 Level-2A acquisitions for land cover dynamics and urban expansion detection." })] }), errorMessage && (_jsxs("div", { className: "bg-rose-50 border border-rose-200 rounded p-4 text-rose-900 text-xs space-y-1", children: [_jsxs("div", { className: "flex items-center space-x-2 text-rose-800 font-semibold text-xs", children: [_jsx(AlertTriangle, { className: "w-4 h-4 shrink-0" }), _jsx("span", { children: "Sentinel-2 processing unavailable" })] }), _jsx("p", { className: "text-xs text-rose-700", children: "Live Copernicus data could not be retrieved." }), _jsx("p", { className: "text-[11px] text-slate-500", children: "Try again when the data service is available." }), errorMessage && errorMessage !== 'Sentinel-2 processing unavailable' && errorMessage !== 'Live Copernicus data could not be retrieved.' && (_jsxs("p", { className: "text-[10px] font-mono text-slate-600 pt-1 border-t border-rose-200", children: ["Details: ", errorMessage] }))] })), _jsxs("div", { className: "bg-white rounded-lg p-5 border border-slate-200 shadow-xs space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-200 pb-3", children: [_jsxs("h2", { className: "text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center", children: [_jsx(Database, { className: "w-4 h-4 mr-2 text-teal-800" }), "Temporal Pair Selection"] }), _jsx("button", { onClick: handleSearchSentinel2, disabled: isSearching || !aoiBbox, className: "px-3 py-1 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 text-xs rounded border border-slate-300 transition-colors flex items-center space-x-1 font-medium shadow-xs", children: isSearching ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin text-teal-800" }), _jsx("span", { children: "Searching..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Activity, { className: "w-3.5 h-3.5 text-teal-800" }), _jsx("span", { children: "Refresh Scenes" })] })) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-medium text-slate-600 mb-1", children: "Start Date" }), _jsx("input", { type: "date", value: startDate, onChange: (e) => setStartDate(e.target.value), className: "w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-medium text-slate-600 mb-1", children: "End Date" }), _jsx("input", { type: "date", value: endDate, onChange: (e) => setEndDate(e.target.value), className: "w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-[11px] font-medium text-slate-600 mb-1", children: ["Max Cloud Cover: ", _jsxs("span", { className: "text-teal-800 font-mono font-bold", children: [maxCloudCover, "%"] })] }), _jsx("input", { type: "range", min: "0", max: "100", step: "5", value: maxCloudCover, onChange: (e) => setMaxCloudCover(Number(e.target.value)), className: "w-full accent-teal-800 cursor-pointer" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "p-3.5 bg-slate-50 border border-slate-200 rounded space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-bold uppercase tracking-wider text-slate-700", children: "Baseline (Before Scene)" }), beforeProduct && getDataModeBadge(beforeProduct.data_mode)] }), _jsxs("select", { value: beforeProductId || '', onChange: (e) => setBeforeProductId(e.target.value || null), disabled: availableProducts.length === 0, className: "w-full bg-white border border-slate-300 text-slate-800 text-xs rounded p-2 focus:outline-none focus:border-teal-700 disabled:opacity-50 font-mono", children: [_jsx("option", { value: "", children: "Select baseline scene..." }), availableProducts.map(p => (_jsxs("option", { value: p.id, children: [format(new Date(p.acquisition_date), 'MMM dd, yyyy'), " - ", p.name.slice(0, 30), "... (", p.cloud_cover, "% cloud)"] }, p.id)))] }), beforeProduct && (_jsxs("div", { className: "text-[11px] text-slate-600 pt-1 space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center text-slate-500", children: [_jsx(Calendar, { className: "w-3 h-3 mr-1" }), " Sensing:"] }), _jsx("span", { className: "font-mono text-slate-800", children: format(new Date(beforeProduct.acquisition_date), 'MMM dd, yyyy HH:mm') })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center text-slate-500", children: [_jsx(Cloud, { className: "w-3 h-3 mr-1" }), " Cloud:"] }), _jsxs("span", { className: "font-mono text-slate-800", children: [beforeProduct.cloud_cover, "%"] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center text-slate-500", children: [_jsx(MapPin, { className: "w-3 h-3 mr-1" }), " Tile:"] }), _jsx("span", { className: "font-mono text-slate-800", children: beforeProduct.tile_id || 'N/A' })] })] }))] }), _jsxs("div", { className: "p-3.5 bg-slate-50 border border-slate-200 rounded space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-bold uppercase tracking-wider text-slate-700", children: "Monitoring (After Scene)" }), afterProduct && getDataModeBadge(afterProduct.data_mode)] }), _jsxs("select", { value: afterProductId || '', onChange: (e) => setAfterProductId(e.target.value || null), disabled: availableProducts.length === 0, className: "w-full bg-white border border-slate-300 text-slate-800 text-xs rounded p-2 focus:outline-none focus:border-teal-700 disabled:opacity-50 font-mono", children: [_jsx("option", { value: "", children: "Select monitoring scene..." }), availableProducts.map(p => (_jsxs("option", { value: p.id, children: [format(new Date(p.acquisition_date), 'MMM dd, yyyy'), " - ", p.name.slice(0, 30), "... (", p.cloud_cover, "% cloud)"] }, p.id)))] }), afterProduct && (_jsxs("div", { className: "text-[11px] text-slate-600 pt-1 space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center text-slate-500", children: [_jsx(Calendar, { className: "w-3 h-3 mr-1" }), " Sensing:"] }), _jsx("span", { className: "font-mono text-slate-800", children: format(new Date(afterProduct.acquisition_date), 'MMM dd, yyyy HH:mm') })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center text-slate-500", children: [_jsx(Cloud, { className: "w-3 h-3 mr-1" }), " Cloud:"] }), _jsxs("span", { className: "font-mono text-slate-800", children: [afterProduct.cloud_cover, "%"] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center text-slate-500", children: [_jsx(MapPin, { className: "w-3 h-3 mr-1" }), " Tile:"] }), _jsx("span", { className: "font-mono text-slate-800", children: afterProduct.tile_id || 'N/A' })] })] }))] })] }), _jsxs("div", { className: "flex items-center justify-between pt-2 border-t border-slate-200", children: [_jsxs("div", { className: "text-xs text-slate-500 flex items-center gap-1.5", children: [_jsx(Info, { className: "w-3.5 h-3.5 text-teal-800" }), _jsx("span", { children: "NDVI/NDBI differencing on 10m Sentinel-2 Level-2A surface reflectance" })] }), _jsx("button", { onClick: handleRunAnalysis, disabled: isAnalyzing || !beforeProductId || !afterProductId || beforeProductId === afterProductId, className: "px-5 py-2 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center space-x-1.5", children: isAnalyzing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin" }), _jsx("span", { children: "Computing Differences..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Activity, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Run Change Analysis" })] })) })] })] }), beforeProduct && afterProduct && (_jsxs("div", { className: "bg-white rounded-lg p-5 border border-slate-200 shadow-xs space-y-3", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2 text-[10px] font-bold text-teal-800 uppercase tracking-wider font-mono", children: [_jsx(Activity, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Sentinel-2 Bi-Temporal Map Comparison" })] }), _jsx("h2", { className: "text-sm font-bold text-slate-900 mt-0.5", children: "Interactive Before vs After Satellite Inspector" })] }), _jsx("div", { className: "flex items-center space-x-2", children: analysisResult ? (_jsxs(_Fragment, { children: [getDataModeBadge(analysisResult.data_mode), analysisResult.data_mode === 'demo_fallback' && (_jsxs("span", { className: "text-[10px] text-amber-700 font-mono flex items-center", children: [_jsx(AlertTriangle, { className: "w-3 h-3 mr-1 text-amber-600" }), "Demo Mode"] }))] })) : (_jsx("span", { className: "text-xs text-slate-500 font-mono", children: isAnalyzing ? 'Computing difference...' : 'Select Before/After to inspect' })) })] }), _jsx(SatelliteInvestigationMap, { beforeScene: {
                            id: beforeProduct.id,
                            name: beforeProduct.name,
                            acquisition_date: beforeProduct.acquisition_date,
                            tile_id: beforeProduct.tile_id,
                            cloud_cover: beforeProduct.cloud_cover,
                            bbox: beforeProduct.bbox,
                            data_mode: beforeProduct.data_mode,
                            preview_url: getSentinel2PreviewUrl(beforeProduct.id)
                        }, afterScene: {
                            id: afterProduct.id,
                            name: afterProduct.name,
                            acquisition_date: afterProduct.acquisition_date,
                            tile_id: afterProduct.tile_id,
                            cloud_cover: afterProduct.cloud_cover,
                            bbox: afterProduct.bbox,
                            data_mode: afterProduct.data_mode,
                            preview_url: getSentinel2PreviewUrl(afterProduct.id)
                        }, aoiBbox: aoiBbox || [73.70, 18.40, 74.05, 18.70], analysis: analysisResult })] })), analysisResult && (_jsxs("div", { className: "bg-white rounded-lg p-5 border border-slate-200 shadow-xs space-y-4", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3", children: [_jsxs("h2", { className: "text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center", children: [_jsx(Activity, { className: "w-4 h-4 mr-2 text-teal-800" }), "Change Detection Results"] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("button", { type: "button", onClick: handleExportPdf, disabled: isExportingPdf, className: "px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50", title: "Export analysis metrics and findings as PDF summary", children: [isExportingPdf ? (_jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin" })) : exportSuccess ? (_jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-emerald-300" })) : (_jsx(FileDown, { className: "w-3.5 h-3.5" })), _jsx("span", { children: isExportingPdf ? 'Exporting...' : exportSuccess ? 'PDF Downloaded' : 'Export PDF Summary' })] }), getDataModeBadge(analysisResult.data_mode), analysisResult.data_mode === 'demo_fallback' && (_jsxs("span", { className: "text-[10px] text-amber-700 font-mono flex items-center", children: [_jsx(AlertTriangle, { className: "w-3 h-3 mr-1 text-amber-600" }), "Demo Mode"] }))] })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [_jsxs("div", { className: "bg-slate-50 p-3 rounded border border-slate-200", children: [_jsx("span", { className: "text-slate-500 block mb-0.5 text-[11px] font-medium", children: "Change Extent" }), _jsxs("span", { className: "text-lg font-bold text-orange-700 font-mono", children: [(analysisResult.change_percentage * 100).toFixed(1), "%"] })] }), _jsxs("div", { className: "bg-slate-50 p-3 rounded border border-slate-200", children: [_jsx("span", { className: "text-slate-500 block mb-0.5 text-[11px] font-medium", children: "Before Mean NDVI" }), _jsx("span", { className: "text-lg font-bold text-emerald-700 font-mono", children: analysisResult.before_ndvi_avg.toFixed(3) })] }), _jsxs("div", { className: "bg-slate-50 p-3 rounded border border-slate-200", children: [_jsx("span", { className: "text-slate-500 block mb-0.5 text-[11px] font-medium", children: "After Mean NDVI" }), _jsx("span", { className: "text-lg font-bold text-slate-800 font-mono", children: analysisResult.after_ndvi_avg.toFixed(3) })] }), _jsxs("div", { className: "bg-slate-50 p-3 rounded border border-slate-200", children: [_jsx("span", { className: "text-slate-500 block mb-0.5 text-[11px] font-medium", children: "Processing Latency" }), _jsxs("span", { className: "text-lg font-bold text-slate-800 font-mono", children: [analysisResult.metadata.processing_time_ms, " ms"] })] })] }), _jsxs("div", { className: "space-y-3 pt-3 border-t border-slate-200", children: [_jsx("div", { className: "text-xs font-bold uppercase tracking-wider text-slate-700", children: "Detailed Layer Inspector" }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx("button", { onClick: () => setActiveView('before'), className: `px-3 py-1 rounded text-xs font-medium transition-colors ${activeView === 'before'
                                                    ? 'bg-teal-800 text-white'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`, children: "Before" }), _jsx("button", { onClick: () => setActiveView('after'), className: `px-3 py-1 rounded text-xs font-medium transition-colors ${activeView === 'after'
                                                    ? 'bg-teal-800 text-white'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`, children: "After" }), _jsx("button", { onClick: () => setActiveView('change'), className: `px-3 py-1 rounded text-xs font-medium transition-colors ${activeView === 'change'
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`, children: "Change Mask" })] }), activeView === 'change' && (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-[11px] text-slate-500 font-medium", children: "Mask Opacity:" }), _jsx("input", { type: "range", min: "0", max: "1", step: "0.1", value: changeMaskOpacity, onChange: (e) => setChangeMaskOpacity(Number(e.target.value)), className: "w-24 accent-orange-600 cursor-pointer" })] }))] }), _jsxs("div", { className: "relative h-96 w-full rounded-lg overflow-hidden border border-slate-300 bg-slate-100", children: [activeView === 'before' && beforeProduct && (_jsx("img", { src: getSentinel2PreviewUrl(beforeProduct.id), alt: "Before scene", className: "w-full h-full object-cover", onError: (e) => {
                                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjI1NiIgeT0iMjU2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNjQ3NDhiIiBmb250LXNpemU9IjE0Ij5JbWFnZSBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                                        } })), activeView === 'after' && afterProduct && (_jsx("img", { src: getSentinel2PreviewUrl(afterProduct.id), alt: "After scene", className: "w-full h-full object-cover", onError: (e) => {
                                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iI2YxZjVmOSIvPjx0ZXh0IHg9IjI1NiIgeT0iMjU2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiBmaWxsPSIjNjQ3NDhiIiBmb250LXNpemU9IjE0Ij5JbWFnZSBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                                        } })), activeView === 'change' && (_jsxs("div", { className: "relative w-full h-full", children: [_jsx("img", { src: getSentinel2PreviewUrl(afterProduct?.id || ''), alt: "Background", className: "w-full h-full object-cover", style: { opacity: 0.5 } }), _jsx("img", { src: getChangeMaskUrl(analysisResult.analysis_id), alt: "Change mask", className: "absolute inset-0 w-full h-full object-cover", style: { opacity: changeMaskOpacity }, onError: (e) => {
                                                    e.currentTarget.style.display = 'none';
                                                } })] })), !beforeProduct && activeView === 'before' && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center text-slate-500 text-xs", children: "Select a before scene to view imagery" })), !afterProduct && activeView === 'after' && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center text-slate-500 text-xs", children: "Select an after scene to view imagery" }))] })] }), _jsxs("div", { className: "bg-slate-50 rounded border border-slate-200 p-3 space-y-1.5", children: [_jsx("h3", { className: "text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono", children: "Analysis Lineage Metadata" }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Before Sensing:" }), _jsx("span", { className: "text-slate-900 font-mono", children: format(new Date(analysisResult.metadata.before_date), 'MMM dd, yyyy') })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "After Sensing:" }), _jsx("span", { className: "text-slate-900 font-mono", children: format(new Date(analysisResult.metadata.after_date), 'MMM dd, yyyy') })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Algorithm:" }), _jsx("span", { className: "text-slate-900 font-mono", children: analysisResult.processing_method })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Before Cloud:" }), _jsxs("span", { className: "text-slate-900 font-mono", children: [analysisResult.metadata.before_cloud_cover, "%"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "After Cloud:" }), _jsxs("span", { className: "text-slate-900 font-mono", children: [analysisResult.metadata.after_cloud_cover, "%"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-slate-500", children: "Changed Pixels:" }), _jsx("span", { className: "text-slate-900 font-bold font-mono", children: analysisResult.statistics.changed_pixels.toLocaleString() })] })] }), analysisResult.message && (_jsx("div", { className: "mt-2 p-2 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900", children: analysisResult.message }))] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [beforeProduct && (_jsxs("a", { href: beforeProduct.cdse_browser_url, target: "_blank", rel: "noopener noreferrer", className: "px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs rounded border border-slate-300 transition-colors flex items-center space-x-1 shadow-xs", children: [_jsx(ExternalLink, { className: "w-3.5 h-3.5 text-slate-400" }), _jsx("span", { children: "Before in CDSE" })] })), afterProduct && (_jsxs("a", { href: afterProduct.cdse_browser_url, target: "_blank", rel: "noopener noreferrer", className: "px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs rounded border border-slate-300 transition-colors flex items-center space-x-1 shadow-xs", children: [_jsx(ExternalLink, { className: "w-3.5 h-3.5 text-slate-400" }), _jsx("span", { children: "After in CDSE" })] }))] }), _jsxs("button", { type: "button", onClick: handleExportPdf, disabled: isExportingPdf, className: "px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50", children: [isExportingPdf ? (_jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin" })) : exportSuccess ? (_jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-emerald-300" })) : (_jsx(FileDown, { className: "w-3.5 h-3.5" })), _jsx("span", { children: isExportingPdf ? 'Generating PDF...' : exportSuccess ? 'PDF Downloaded' : 'Export PDF Summary' })] })] })] }))] }));
};
export default ChangeAnalysis;
