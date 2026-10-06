import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Search, Calendar, Cloud, MapPin, Loader2, ExternalLink, Copy, Check, SlidersHorizontal, ChevronDown, ChevronUp, AlertCircle, Eye, Database, Crosshair, ArrowUpDown } from 'lucide-react';
import { format, subDays } from 'date-fns';
import LeafletMapView from '../features/discovery/components/LeafletMapView';
import { searchSentinel2 } from '../services/api';
const PRESET_AOIS = [
    {
        name: 'Pune & Western Ghats',
        bbox: [73.70, 18.40, 74.05, 18.70],
        description: 'Urban expansion and vegetation zone in Maharashtra'
    },
    {
        name: 'Mumbai Coastal Region',
        bbox: [72.75, 18.90, 73.10, 19.25],
        description: 'Harbor, mangroves, and dense coastal metropolitan area'
    },
    {
        name: 'Bengaluru Tech Corridor',
        bbox: [77.45, 12.85, 77.75, 13.10],
        description: 'Urban lakes, rapid development, and technology parks'
    },
    {
        name: 'Delhi NCR Metropolitan',
        bbox: [76.90, 28.45, 77.35, 28.85],
        description: 'National capital region, Yamuna river basin'
    },
    {
        name: 'Jaipur & Aravalli Region',
        bbox: [75.65, 26.80, 75.95, 27.05],
        description: 'Heritage urban center and semi-arid terrain'
    },
    {
        name: 'Chennai Coastal Zone',
        bbox: [80.10, 12.90, 80.35, 13.20],
        description: 'Port city and coastal wetlands along Coromandel Coast'
    }
];
export const Sentinel2Search = () => {
    // Query Parameters State
    const [aoiBbox, setAoiBbox] = useState(PRESET_AOIS[0].bbox);
    const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
    // Default to May 2024 verified clear-sky benchmark window for instant live ESA results
    const [startDate, setStartDate] = useState('2024-05-01');
    const [endDate, setEndDate] = useState('2024-05-25');
    const [maxCloudCover, setMaxCloudCover] = useState(30);
    const [productType, setProductType] = useState('S2MSI2A');
    const [limit, setLimit] = useState(20);
    // UI / Map Interaction State
    const [isDrawingAoi, setIsDrawingAoi] = useState(false);
    const [isForceRefresh, setIsForceRefresh] = useState(false);
    const [showManualCoords, setShowManualCoords] = useState(false);
    const [showVerificationGuide, setShowVerificationGuide] = useState(false);
    const [showOdataInspector, setShowOdataInspector] = useState(false);
    const [manualMinLon, setManualMinLon] = useState(String(PRESET_AOIS[0].bbox[0]));
    const [manualMinLat, setManualMinLat] = useState(String(PRESET_AOIS[0].bbox[1]));
    const [manualMaxLon, setManualMaxLon] = useState(String(PRESET_AOIS[0].bbox[2]));
    const [manualMaxLat, setManualMaxLat] = useState(String(PRESET_AOIS[0].bbox[3]));
    // Search Results State
    const [isLoading, setIsLoading] = useState(false);
    const [searchResponse, setSearchResponse] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [sortBy, setSortBy] = useState('date');
    const [copiedId, setCopiedId] = useState(null);
    // Sync manual inputs when AOI bbox changes
    useEffect(() => {
        if (aoiBbox) {
            setManualMinLon(String(aoiBbox[0]));
            setManualMinLat(String(aoiBbox[1]));
            setManualMaxLon(String(aoiBbox[2]));
            setManualMaxLat(String(aoiBbox[3]));
        }
    }, [aoiBbox]);
    // Handle Preset selection
    const handlePresetChange = (indexStr) => {
        if (indexStr === '') {
            setSelectedPresetIndex('');
            return;
        }
        const idx = Number(indexStr);
        setSelectedPresetIndex(idx);
        const preset = PRESET_AOIS[idx];
        if (preset) {
            setAoiBbox(preset.bbox);
        }
    };
    // Apply manual coordinate inputs
    const handleApplyManualCoords = () => {
        const minLon = parseFloat(manualMinLon);
        const minLat = parseFloat(manualMinLat);
        const maxLon = parseFloat(manualMaxLon);
        const maxLat = parseFloat(manualMaxLat);
        if (isNaN(minLon) || isNaN(minLat) || isNaN(maxLon) || isNaN(maxLat)) {
            setErrorMessage('All 4 coordinate values must be valid decimal numbers.');
            return;
        }
        if (minLon >= maxLon || minLat >= maxLat) {
            setErrorMessage('Bounding box requires minLon < maxLon and minLat < maxLat.');
            return;
        }
        if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
            setErrorMessage('Coordinates must be in valid WGS84 range (-180 to 180, -90 to 90).');
            return;
        }
        setErrorMessage(null);
        setSelectedPresetIndex('');
        setAoiBbox([minLon, minLat, maxLon, maxLat]);
    };
    // Quick Date Range helpers
    const handleSetDatePreset = (daysAgo) => {
        const end = new Date();
        const start = subDays(end, daysAgo);
        setStartDate(format(start, 'yyyy-MM-dd'));
        setEndDate(format(end, 'yyyy-MM-dd'));
    };
    // Perform Sentinel-2 Search
    const handleSearch = async (e, overrideForceRefresh) => {
        if (e)
            e.preventDefault();
        if (!aoiBbox) {
            setErrorMessage('Please select or draw an Area of Interest (AOI) on the map.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setErrorMessage('Start date must be earlier than or equal to End date.');
            return;
        }
        const force = overrideForceRefresh !== undefined ? overrideForceRefresh : isForceRefresh;
        setErrorMessage(null);
        setIsLoading(true);
        setHasSearched(true);
        setSelectedProduct(null);
        try {
            const response = await searchSentinel2({
                bbox: aoiBbox,
                start_date: startDate,
                end_date: endDate,
                max_cloud_cover: maxCloudCover,
                product_type: productType,
                limit,
                force_refresh: force
            });
            setSearchResponse(response);
            if (response.results.length > 0) {
                setSelectedProduct(response.results[0]);
            }
        }
        catch (err) {
            console.error('Sentinel-2 search failed:', err);
            const detail = err.response?.data?.detail || err.message || 'Failed to search Sentinel-2 imagery.';
            setErrorMessage(detail);
            setSearchResponse(null);
        }
        finally {
            setIsLoading(false);
        }
    };
    // Auto-search once on mount with default Pune preset
    useEffect(() => {
        handleSearch();
    }, []);
    // Sorted Results
    const sortedProducts = React.useMemo(() => {
        if (!searchResponse || !searchResponse.results)
            return [];
        const list = [...searchResponse.results];
        if (sortBy === 'date') {
            list.sort((a, b) => new Date(b.acquisition_date).getTime() - new Date(a.acquisition_date).getTime());
        }
        else if (sortBy === 'cloud') {
            list.sort((a, b) => a.cloud_cover - b.cloud_cover);
        }
        return list;
    }, [searchResponse, sortBy]);
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedId(text);
        setTimeout(() => setCopiedId(null), 2000);
    };
    return (_jsxs("div", { className: "p-6 space-y-6 max-w-7xl mx-auto", children: [_jsx("div", { className: "bg-white rounded-lg p-5 border border-slate-200 shadow-xs", children: _jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2.5 mb-1.5", children: [_jsx("span", { className: "px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-[11px] font-mono font-semibold uppercase tracking-wider", children: "Copernicus Data Space Ecosystem" }), _jsx("span", { className: "text-xs text-slate-500 font-mono", children: "SIH 2026 Problem Statement 26227" })] }), _jsx("h1", { className: "text-xl font-bold text-slate-900 tracking-tight", children: "Sentinel-2 Multi-Spectral Scene Discovery" }), _jsx("p", { className: "text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed", children: "Direct OData catalog discovery for European Space Agency (ESA) Copernicus Sentinel-2 Level-2A surface reflectance imagery. Select an Area of Interest (AOI), filter by sensing date and cloud coverage, and inspect real scene footprints with ground resolution telemetry." })] }), _jsx("div", { className: "flex items-center space-x-2 self-start md:self-auto", children: _jsxs("a", { href: "https://dataspace.copernicus.eu/", target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium transition-colors shadow-xs", children: [_jsx("span", { children: "CDSE Portal" }), _jsx(ExternalLink, { className: "w-3.5 h-3.5 text-slate-400" })] }) })] }) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6", children: [_jsxs("div", { className: "lg:col-span-4 space-y-5", children: [_jsxs("form", { onSubmit: handleSearch, className: "bg-white rounded-lg p-5 border border-slate-200 shadow-xs space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-200 pb-3", children: [_jsxs("h2", { className: "text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center", children: [_jsx(SlidersHorizontal, { className: "w-4 h-4 mr-2 text-teal-800" }), "Query Parameters"] }), _jsx("span", { className: "text-[11px] font-mono text-slate-500", children: "OData API" })] }), errorMessage && (_jsxs("div", { className: "bg-rose-50 border border-rose-200 rounded p-3 space-y-1 text-rose-900 text-xs", children: [_jsxs("div", { className: "flex items-center space-x-2 text-rose-800 font-semibold text-xs", children: [_jsx(AlertCircle, { className: "w-4 h-4 shrink-0" }), _jsx("span", { children: "Sentinel-2 processing unavailable" })] }), _jsx("p", { className: "text-xs text-rose-700", children: "Live Copernicus data could not be retrieved." }), _jsx("p", { className: "text-[11px] text-slate-500", children: "Try again when the data service is available." }), errorMessage && errorMessage !== 'Sentinel-2 processing unavailable' && errorMessage !== 'Live Copernicus data could not be retrieved.' && (_jsxs("p", { className: "text-[10px] font-mono text-slate-600 pt-1 border-t border-rose-200", children: ["Details: ", errorMessage] }))] })), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block text-xs font-bold uppercase text-slate-700 tracking-wider", children: "1. Area of Interest (AOI)" }), _jsxs("div", { className: "space-y-1", children: [_jsx("span", { className: "text-[11px] text-slate-500", children: "Regional Presets:" }), _jsxs("select", { value: selectedPresetIndex, onChange: (e) => handlePresetChange(e.target.value), className: "w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700", children: [_jsx("option", { value: "", children: "-- Custom Drawn / Coordinate BBox --" }), PRESET_AOIS.map((preset, idx) => (_jsxs("option", { value: idx, children: [preset.name, " (", preset.bbox[1].toFixed(2), "N, ", preset.bbox[0].toFixed(2), "E)"] }, preset.name)))] })] }), _jsxs("div", { className: "flex items-center gap-2 pt-1", children: [_jsxs("button", { type: "button", onClick: () => setIsDrawingAoi(!isDrawingAoi), className: `flex-1 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors ${isDrawingAoi
                                                            ? 'bg-amber-100 text-amber-900 border border-amber-400 font-semibold'
                                                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'}`, children: [_jsx(Crosshair, { className: "w-3.5 h-3.5 text-slate-600" }), _jsx("span", { children: isDrawingAoi ? 'Drawing Active...' : 'Draw AOI on Map' })] }), _jsxs("button", { type: "button", onClick: () => setShowManualCoords(!showManualCoords), className: "px-2.5 py-1.5 rounded text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center space-x-1", title: "Edit bounding box numbers directly", children: [_jsx("span", { children: "BBox" }), showManualCoords ? _jsx(ChevronUp, { className: "w-3 h-3" }) : _jsx(ChevronDown, { className: "w-3 h-3" })] })] }), showManualCoords && (_jsxs("div", { className: "p-2.5 bg-slate-50 border border-slate-200 rounded space-y-2 text-xs", children: [_jsx("p", { className: "text-[11px] text-slate-500 font-mono", children: "WGS84 [minLon, minLat, maxLon, maxLat]:" }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[10px] text-slate-500", children: "Min Lon (West)" }), _jsx("input", { type: "number", step: "0.01", value: manualMinLon, onChange: (e) => setManualMinLon(e.target.value), className: "w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[10px] text-slate-500", children: "Min Lat (South)" }), _jsx("input", { type: "number", step: "0.01", value: manualMinLat, onChange: (e) => setManualMinLat(e.target.value), className: "w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[10px] text-slate-500", children: "Max Lon (East)" }), _jsx("input", { type: "number", step: "0.01", value: manualMaxLon, onChange: (e) => setManualMaxLon(e.target.value), className: "w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[10px] text-slate-500", children: "Max Lat (North)" }), _jsx("input", { type: "number", step: "0.01", value: manualMaxLat, onChange: (e) => setManualMaxLat(e.target.value), className: "w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono" })] })] }), _jsx("button", { type: "button", onClick: handleApplyManualCoords, className: "w-full py-1 text-center bg-teal-800 hover:bg-teal-900 text-white rounded font-medium text-[11px] transition-colors", children: "Apply Coordinates" })] })), aoiBbox && (_jsxs("div", { className: "flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700", children: [_jsxs("div", { className: "flex items-center space-x-1.5 truncate", children: [_jsx(MapPin, { className: "w-3.5 h-3.5 shrink-0 text-teal-800" }), _jsxs("span", { className: "font-mono", children: [aoiBbox[1].toFixed(2), ", ", aoiBbox[0].toFixed(2), " \u2192 ", aoiBbox[3].toFixed(2), ", ", aoiBbox[2].toFixed(2)] })] }), _jsx("span", { className: "text-[10px] uppercase font-bold text-teal-800 font-mono", children: "Active AOI" })] }))] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "block text-xs font-bold uppercase text-slate-700 tracking-wider", children: "2. Sensing Date Range" }), _jsxs("div", { className: "flex items-center space-x-1 text-[10px]", children: [_jsx("button", { type: "button", onClick: () => {
                                                                    setStartDate('2024-05-01');
                                                                    setEndDate('2024-05-25');
                                                                }, className: "px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded font-medium", title: "Verified clear-sky benchmark window with guaranteed live Copernicus Sentinel-2 Level-2A imagery", children: "Benchmark: May 2024" }), _jsx("button", { type: "button", onClick: () => handleSetDatePreset(14), className: "px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200", children: "14d" }), _jsx("button", { type: "button", onClick: () => handleSetDatePreset(30), className: "px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200", children: "30d" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("span", { className: "block text-[11px] text-slate-500 mb-1", children: "Start Date" }), _jsx("div", { className: "relative", children: _jsx("input", { type: "date", value: startDate, onChange: (e) => setStartDate(e.target.value), max: endDate, className: "w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono" }) })] }), _jsxs("div", { children: [_jsx("span", { className: "block text-[11px] text-slate-500 mb-1", children: "End Date" }), _jsx("div", { className: "relative", children: _jsx("input", { type: "date", value: endDate, onChange: (e) => setEndDate(e.target.value), min: startDate, className: "w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono" }) })] })] })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsxs("label", { className: "font-bold uppercase text-slate-700 tracking-wider", children: ["3. Cloud Threshold: ", _jsxs("span", { className: "text-teal-800 font-mono font-bold", children: [maxCloudCover, "%"] })] }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx("button", { type: "button", onClick: () => setMaxCloudCover(10), className: "px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded", children: "\u226410%" }), _jsx("button", { type: "button", onClick: () => setMaxCloudCover(30), className: "px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded", children: "\u226430%" }), _jsx("button", { type: "button", onClick: () => setMaxCloudCover(100), className: "px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded", children: "All" })] })] }), _jsx("input", { type: "range", min: "0", max: "100", step: "5", value: maxCloudCover, onChange: (e) => setMaxCloudCover(Number(e.target.value)), className: "w-full accent-teal-800 cursor-pointer" }), _jsxs("div", { className: "flex justify-between text-[10px] text-slate-500 font-mono", children: [_jsx("span", { children: "0% (Clear Sky)" }), _jsx("span", { children: "50%" }), _jsx("span", { children: "100% (Any)" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 pt-1", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-medium text-slate-600 mb-1", children: "Product Level" }), _jsxs("select", { value: productType, onChange: (e) => setProductType(e.target.value), className: "w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono", children: [_jsx("option", { value: "S2MSI2A", children: "Level-2A (Bottom of Atmos.)" }), _jsx("option", { value: "S2MSI1C", children: "Level-1C (Top of Atmos.)" }), _jsx("option", { value: "ALL", children: "All Levels" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] font-medium text-slate-600 mb-1", children: "Result Limit" }), _jsxs("select", { value: limit, onChange: (e) => setLimit(Number(e.target.value)), className: "w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono", children: [_jsx("option", { value: "10", children: "10 products" }), _jsx("option", { value: "20", children: "20 products" }), _jsx("option", { value: "50", children: "50 products" })] })] })] }), _jsx("div", { className: "pt-1 flex items-center justify-between text-xs text-slate-700", children: _jsxs("label", { className: "flex items-center space-x-2 cursor-pointer select-none", children: [_jsx("input", { type: "checkbox", checked: isForceRefresh, onChange: (e) => setIsForceRefresh(e.target.checked), className: "rounded border-slate-300 text-teal-800 focus:ring-teal-700" }), _jsx("span", { className: "text-[11px] text-slate-600", children: "Force Live CDSE Query (bypass cache)" })] }) }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1", children: [_jsx("button", { type: "submit", disabled: isLoading || !aoiBbox, className: "py-2 px-3 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium rounded shadow-xs transition-colors flex items-center justify-center space-x-1.5 text-xs", children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin" }), _jsx("span", { children: "Searching..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Search, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Query Catalog" })] })) }), _jsxs("button", { type: "button", onClick: () => handleSearch(undefined, true), disabled: isLoading || !aoiBbox, className: "py-2 px-3 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-teal-800 border border-teal-300 font-medium rounded shadow-xs transition-colors flex items-center justify-center space-x-1.5 text-xs", title: "Bypass in-memory cache and directly query live Copernicus OData", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-teal-700" }), _jsx("span", { children: "Force Live CDSE" })] })] })] }), searchResponse && (_jsxs("div", { className: "bg-white rounded-lg p-4 border border-slate-200 shadow-xs text-xs space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between pb-2 border-b border-slate-200", children: [_jsx("span", { className: "text-slate-600 font-medium", children: "Data Origin:" }), searchResponse.data_mode === 'live_copernicus' ? (_jsxs("span", { className: "px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-teal-700" }), "LIVE Copernicus API"] })) : searchResponse.data_mode === 'cached' ? (_jsxs("span", { className: "px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-600" }), "Cached (", searchResponse.cache_age_seconds || 0, "s old)"] })) : (_jsxs("span", { className: "px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-600" }), "Demo Benchmark"] }))] }), _jsxs("div", { className: "flex items-center justify-between text-slate-600", children: [_jsx("span", { children: "Endpoint:" }), _jsx("span", { className: "text-slate-900 font-mono text-[10px] truncate max-w-[200px]", title: searchResponse.api_endpoint, children: "catalogue.dataspace.copernicus.eu" })] }), _jsxs("div", { className: "flex items-center justify-between text-slate-600", children: [_jsx("span", { children: "Query Latency:" }), _jsxs("span", { className: "text-slate-900 font-mono", children: [searchResponse.execution_time_ms, " ms"] })] }), _jsxs("div", { className: "flex items-center justify-between text-slate-600", children: [_jsx("span", { children: "Scenes Discovered:" }), _jsx("span", { className: "text-slate-900 font-bold font-mono", children: searchResponse.total_results })] }), searchResponse.data_mode === 'cached' && (_jsxs("div", { className: "flex items-center justify-between text-slate-600", children: [_jsx("span", { children: "Cache Status:" }), _jsx("button", { type: "button", onClick: () => handleSearch(undefined, true), className: "text-teal-800 hover:text-teal-900 underline text-[11px] font-medium", children: "Query Live CDSE Now \u2192" })] })), _jsxs("div", { className: "pt-2 border-t border-slate-200 flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setShowOdataInspector(!showOdataInspector), className: "flex-1 py-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded text-[11px] border border-slate-300 transition-colors text-center", children: showOdataInspector ? 'Hide Query' : 'Inspect OData' }), _jsx("button", { type: "button", onClick: () => setShowVerificationGuide(true), className: "flex-1 py-1 px-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded text-[11px] border border-teal-300 transition-colors text-center font-medium", children: "Verify Live ESA \u2192" })] }), showOdataInspector && searchResponse.odata_filter && (_jsxs("div", { className: "p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-slate-700 font-semibold", children: [_jsx("span", { children: "OData $filter Expression:" }), _jsx("button", { type: "button", onClick: () => copyToClipboard(searchResponse.odata_filter || ''), className: "text-teal-800 hover:underline", children: "Copy" })] }), _jsx("pre", { className: "font-mono text-slate-800 break-all whitespace-pre-wrap bg-white p-2 rounded border border-slate-200 max-h-32 overflow-y-auto", children: searchResponse.odata_filter })] })), searchResponse.message && (_jsx("div", { className: "mt-2 p-2 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900", children: searchResponse.message }))] }))] }), _jsx("div", { className: "lg:col-span-8 flex flex-col space-y-4", children: _jsxs("div", { className: "bg-white rounded-lg border border-slate-200 p-2.5 flex-1 min-h-[500px] flex flex-col shadow-xs", children: [_jsxs("div", { className: "px-3 py-2 flex items-center justify-between border-b border-slate-200 text-xs", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-teal-700" }), _jsx("span", { className: "font-bold text-slate-900 uppercase tracking-wider text-[11px]", children: "Interactive Spatial Viewer" }), _jsx("span", { className: "text-slate-500 text-[11px] hidden sm:inline", children: "\u2022 Click scene footprints to inspect details" })] }), _jsx("div", { className: "text-slate-500 font-mono text-[11px]", children: sortedProducts.length > 0 ? `${sortedProducts.length} Footprints` : 'No Footprints' })] }), _jsx("div", { className: "flex-1 min-h-[460px] relative mt-2", children: _jsx(LeafletMapView, { aoiBbox: aoiBbox, onAoiChange: setAoiBbox, products: sortedProducts, selectedProductId: selectedProduct?.id || null, onSelectProduct: (prod) => setSelectedProduct(prod), isDrawingAoi: isDrawingAoi, setIsDrawingAoi: setIsDrawingAoi, center: [
                                            aoiBbox ? (aoiBbox[1] + aoiBbox[3]) / 2 : 18.5204,
                                            aoiBbox ? (aoiBbox[0] + aoiBbox[2]) / 2 : 73.8567
                                        ], zoom: 7 }) })] }) })] }), _jsxs("div", { className: "bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs", children: [_jsxs("div", { className: "p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(Database, { className: "w-4 h-4 text-teal-800" }), _jsxs("div", { children: [_jsxs("h3", { className: "text-sm font-bold uppercase tracking-wider text-slate-900", children: ["Discovered Sentinel-2 Scenes (", sortedProducts.length, ")"] }), _jsxs("p", { className: "text-xs text-slate-500 font-mono", children: ["AOI footprint match \u2022 Dates: ", startDate, " to ", endDate, " \u2022 Cloud \u2264 ", maxCloudCover, "%"] })] })] }), sortedProducts.length > 0 && (_jsxs("div", { className: "flex items-center space-x-2 text-xs", children: [_jsxs("span", { className: "text-slate-500 flex items-center", children: [_jsx(ArrowUpDown, { className: "w-3.5 h-3.5 mr-1 text-slate-400" }), "Sort:"] }), _jsx("button", { type: "button", onClick: () => setSortBy('date'), className: `px-2.5 py-1 rounded text-xs font-medium transition-colors ${sortBy === 'date'
                                            ? 'bg-teal-800 text-white font-semibold'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`, children: "Date (Newest)" }), _jsx("button", { type: "button", onClick: () => setSortBy('cloud'), className: `px-2.5 py-1 rounded text-xs font-medium transition-colors ${sortBy === 'cloud'
                                            ? 'bg-teal-800 text-white font-semibold'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`, children: "Cloud (Lowest)" })] }))] }), isLoading ? (_jsxs("div", { className: "py-16 text-center space-y-2", children: [_jsx(Loader2, { className: "w-6 h-6 text-teal-800 animate-spin mx-auto" }), _jsx("p", { className: "text-xs font-semibold text-slate-800", children: "Querying Copernicus Data Space catalog..." }), _jsx("p", { className: "text-[11px] text-slate-500 font-mono", children: "Filtering by spatial intersection & sensing attributes" })] })) : sortedProducts.length === 0 ? (_jsxs("div", { className: "py-14 text-center space-y-2.5 px-4", children: [_jsx("div", { className: "w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400", children: _jsx(Search, { className: "w-5 h-5" }) }), _jsx("h4", { className: "text-sm font-semibold text-slate-900", children: "No Sentinel-2 Imagery Found" }), _jsxs("p", { className: "text-xs text-slate-500 max-w-md mx-auto", children: ["No scenes matched the current AOI and criteria (", startDate, " to ", endDate, ", cloud \u2264 ", maxCloudCover, "%)."] }), _jsx("div", { className: "pt-1 flex justify-center gap-2", children: _jsx("button", { type: "button", onClick: () => {
                                        setMaxCloudCover(100);
                                        handleSetDatePreset(60);
                                    }, className: "px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded border border-slate-300 transition-colors", children: "Expand Date Range & Set Max Cloud to 100%" }) })] })) : (_jsx("div", { className: "p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3", children: sortedProducts.map((product) => {
                            const isSelected = selectedProduct?.id === product.id;
                            const cloudColor = product.cloud_cover < 10
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : product.cloud_cover < 30
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300';
                            const formattedDate = product.acquisition_date
                                ? format(new Date(product.acquisition_date), 'MMM dd, yyyy HH:mm')
                                : 'Unknown';
                            return (_jsxs("div", { onClick: () => setSelectedProduct(product), className: `rounded border transition-all p-3.5 cursor-pointer flex flex-col justify-between ${isSelected
                                    ? 'bg-teal-50/30 border-teal-700 ring-1 ring-teal-700 shadow-sm'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'}`, children: [_jsxs("div", { className: "space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx("span", { className: "px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-mono font-semibold", children: product.product_type }), product.data_mode === 'live_copernicus' ? (_jsxs("span", { className: "px-1.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-[10px] font-mono font-bold flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-teal-700" }), "Live"] })) : product.data_mode === 'cached' ? (_jsxs("span", { className: "px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[10px] font-mono font-bold flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-600" }), "Cached"] })) : (_jsxs("span", { className: "px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[10px] font-mono font-bold flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-600" }), "Demo"] }))] }), _jsxs("span", { className: `px-2 py-0.5 border rounded text-[10px] font-mono font-medium flex items-center space-x-1 ${cloudColor}`, children: [_jsx(Cloud, { className: "w-3 h-3" }), _jsxs("span", { children: [product.cloud_cover, "% Cloud"] })] })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-xs font-semibold text-slate-900 line-clamp-2 hover:text-teal-800 transition-colors", title: product.name, children: product.name }), _jsxs("p", { className: "text-[11px] text-slate-500 font-mono mt-0.5", children: ["ID: ", product.id.slice(0, 8), "...", product.id.slice(-6)] })] }), _jsxs("div", { className: "space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-200", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-slate-500 flex items-center text-[11px]", children: [_jsx(Calendar, { className: "w-3 h-3 mr-1 text-slate-400" }), "Acquisition:"] }), _jsxs("span", { className: "font-mono text-[11px] text-slate-800", children: [formattedDate, " UTC"] })] }), _jsxs("div", { className: "flex items-center justify-between text-[11px]", children: [_jsx("span", { className: "text-slate-500", children: "Platform:" }), _jsx("span", { className: "font-mono text-slate-800", children: product.platform })] }), _jsxs("div", { className: "flex items-center justify-between text-[11px]", children: [_jsx("span", { className: "text-slate-500", children: "Tile ID:" }), _jsx("span", { className: "font-mono text-slate-800", children: product.tile_id || 'N/A' })] }), _jsxs("div", { className: "flex items-center justify-between text-[11px]", children: [_jsx("span", { className: "text-slate-500", children: "Centroid:" }), _jsxs("span", { className: "font-mono text-slate-800", children: [product.center[1].toFixed(2), "\u00B0N, ", product.center[0].toFixed(2), "\u00B0E"] })] })] })] }), _jsxs("div", { className: "mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between gap-1.5", children: [_jsxs("button", { type: "button", onClick: (e) => {
                                                    e.stopPropagation();
                                                    setSelectedProduct(product);
                                                }, className: `flex-1 py-1 px-2 rounded text-xs font-medium flex items-center justify-center space-x-1 transition-colors ${isSelected
                                                    ? 'bg-teal-800 text-white'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`, children: [_jsx(Eye, { className: "w-3.5 h-3.5" }), _jsx("span", { children: isSelected ? 'Inspecting' : 'View Footprint' })] }), _jsx("a", { href: product.cdse_browser_url, target: "_blank", rel: "noopener noreferrer", onClick: (e) => e.stopPropagation(), className: "p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors", title: "Open full interactive Sentinel-2 scene in Copernicus Browser", children: _jsx(ExternalLink, { className: "w-3.5 h-3.5" }) }), _jsx("button", { type: "button", onClick: (e) => {
                                                    e.stopPropagation();
                                                    copyToClipboard(product.id);
                                                }, className: "p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors", title: "Copy Copernicus Product UUID", children: copiedId === product.id ? (_jsx(Check, { className: "w-3.5 h-3.5 text-emerald-700" })) : (_jsx(Copy, { className: "w-3.5 h-3.5" })) })] })] }, product.id));
                        }) }))] }), selectedProduct && (_jsxs("div", { className: "bg-white rounded-lg p-5 border border-slate-300 shadow-xs space-y-3", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2 mb-1", children: [_jsx("span", { className: "text-[11px] font-bold text-teal-800 uppercase tracking-wider font-mono", children: "Inspecting Sentinel-2 Scene Footprint" }), selectedProduct.data_mode === 'live_copernicus' ? (_jsxs("span", { className: "px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-teal-700" }), "LIVE Copernicus API"] })) : selectedProduct.data_mode === 'cached' ? (_jsxs("span", { className: "px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-600" }), "Cached Data"] })) : (_jsxs("span", { className: "px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-amber-600" }), "Demo Benchmark"] }))] }), _jsx("h3", { className: "text-sm font-bold text-slate-900 break-all", children: selectedProduct.name })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("a", { href: selectedProduct.cdse_browser_url, target: "_blank", rel: "noopener noreferrer", className: "px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs", children: [_jsx("span", { children: "Copernicus Browser" }), _jsx(ExternalLink, { className: "w-3.5 h-3.5" })] }), _jsx("button", { type: "button", onClick: () => setSelectedProduct(null), className: "px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium", children: "Close" })] })] }), _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs", children: [_jsxs("div", { className: "bg-slate-50 p-2.5 rounded border border-slate-200", children: [_jsx("span", { className: "text-slate-500 block mb-0.5 text-[11px]", children: "Copernicus UUID" }), _jsx("span", { className: "font-mono text-slate-800 text-[11px] break-all", children: selectedProduct.id })] }), _jsxs("div", { className: "bg-slate-50 p-2.5 rounded border border-slate-200", children: [_jsx("span", { className: "text-slate-500 block mb-0.5 text-[11px]", children: "Acquisition Date" }), _jsxs("span", { className: "text-slate-800 font-mono text-[11px]", children: [selectedProduct.acquisition_date
                                                ? format(new Date(selectedProduct.acquisition_date), 'MMM dd, yyyy HH:mm')
                                                : 'N/A', ' ', "UTC"] })] }), _jsxs("div", { className: "bg-slate-50 p-2.5 rounded border border-slate-200", children: [_jsx("span", { className: "text-slate-500 block mb-0.5 text-[11px]", children: "Cloud Coverage" }), _jsxs("span", { className: "text-slate-900 font-bold font-mono", children: [selectedProduct.cloud_cover, "%"] })] }), _jsxs("div", { className: "bg-slate-50 p-2.5 rounded border border-slate-200", children: [_jsx("span", { className: "text-slate-500 block mb-0.5 text-[11px]", children: "Processing Level" }), _jsx("span", { className: "text-slate-900 font-bold font-mono", children: selectedProduct.product_type })] })] }), selectedProduct.metadata && Object.keys(selectedProduct.metadata).length > 0 && (_jsxs("div", { className: "pt-1 text-xs", children: [_jsx("p", { className: "text-slate-500 mb-1 text-[11px] uppercase tracking-wider font-semibold", children: "Sensor Attributes:" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: Object.entries(selectedProduct.metadata).map(([key, val]) => (val ? (_jsxs("span", { className: "px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded font-mono text-[10px]", children: [key, ": ", String(val)] }, key)) : null)) })] }))] }))] }));
};
export default Sentinel2Search;
