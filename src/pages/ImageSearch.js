import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Image as ImageIcon, Upload, Sparkles, MapPin, Calendar, Loader2, Check, Layers } from 'lucide-react';
import { imageSearch } from '../services/api';
const SAMPLE_PATCHES = [
    {
        id: 'patch-1',
        name: 'Industrial & Earthwork Site',
        category: 'Construction',
        description: 'Ground clearing, heavy machinery tracks, and excavated red soil.',
        color: 'from-amber-600 to-orange-700'
    },
    {
        id: 'patch-2',
        name: 'Dense Deciduous Canopy',
        category: 'Vegetation',
        description: 'Western Ghats forest belt with high NDVI spectral signature.',
        color: 'from-emerald-600 to-teal-800'
    },
    {
        id: 'patch-3',
        name: 'Inland Water Reservoir',
        category: 'Water Body',
        description: 'High NIR absorption water basin with sedimentation perimeter.',
        color: 'from-cyan-600 to-blue-800'
    },
    {
        id: 'patch-4',
        name: 'High-Density Residential Grid',
        category: 'Urban',
        description: 'Impervious concrete surfaces, road networks, and building rooftops.',
        color: 'from-slate-600 to-zinc-800'
    }
];
export const ImageSearch = () => {
    const [selectedPatch, setSelectedPatch] = useState(SAMPLE_PATCHES[0]);
    const [customFile, setCustomFile] = useState(null);
    const [limit, setLimit] = useState(6);
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const handleSearch = async () => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            const response = await imageSearch(customFile || selectedPatch.id, limit);
            setResults(response.results || []);
        }
        catch (err) {
            console.error('Image search failed:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCustomFile(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    return (_jsxs("div", { className: "p-6 space-y-6 max-w-7xl mx-auto", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1 font-mono", children: [_jsx(ImageIcon, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Visual Feature Embedding" })] }), _jsx("h1", { className: "text-xl font-bold text-slate-900 tracking-tight", children: "Visual Similarity Search (CBIR)" }), _jsx("p", { className: "text-xs text-slate-600 mt-0.5", children: "Content-Based Image Retrieval using satellite visual representations to find visually identical terrain patterns." })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6", children: [_jsxs("div", { className: "lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs", children: [_jsx("h2", { className: "text-xs font-bold uppercase tracking-wider text-slate-700", children: "Select Query Patch or Upload" }), _jsx("div", { className: "space-y-2", children: SAMPLE_PATCHES.map((patch) => {
                                    const isSelected = !customFile && selectedPatch.id === patch.id;
                                    return (_jsxs("div", { onClick: () => {
                                            setSelectedPatch(patch);
                                            setCustomFile(null);
                                        }, className: `p-3 rounded-lg border cursor-pointer transition-all flex items-center space-x-3 ${isSelected
                                            ? 'bg-teal-50/60 border-teal-700 shadow-xs'
                                            : 'bg-white border-slate-200 hover:border-slate-300'}`, children: [_jsx("div", { className: `w-10 h-10 rounded bg-gradient-to-br ${patch.color} flex items-center justify-center flex-shrink-0 shadow-xs`, children: _jsx(Layers, { className: "w-5 h-5 text-white/90" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-semibold text-slate-900 truncate", children: patch.name }), _jsx("span", { className: "text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200", children: patch.category })] }), _jsx("p", { className: "text-[11px] text-slate-500 truncate mt-0.5", children: patch.description })] }), isSelected && _jsx(Check, { className: "w-4 h-4 text-teal-800 flex-shrink-0" })] }, patch.id));
                                }) }), _jsxs("div", { className: "pt-2 border-t border-slate-200", children: [_jsx("label", { className: "block text-xs font-medium text-slate-600 mb-2", children: "Or upload imagery patch (.tif, .png, .jpg)" }), _jsxs("label", { className: "border-2 border-dashed border-slate-300 hover:border-teal-700 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 transition-colors", children: [_jsx(Upload, { className: "w-5 h-5 text-slate-500 mb-1" }), _jsx("span", { className: "text-xs text-slate-800 font-medium", children: "Click to upload custom AOI patch" }), _jsx("span", { className: "text-[10px] text-slate-500 mt-0.5", children: "Supports Sentinel-2 RGB, GeoTIFF, or PNG" }), _jsx("input", { type: "file", accept: "image/*", onChange: handleFileUpload, className: "hidden" })] }), customFile && (_jsxs("div", { className: "mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1.5", children: [_jsx(Check, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Custom image loaded" })] }))] }), _jsx("button", { onClick: handleSearch, disabled: isLoading, className: "w-full py-2.5 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center justify-center space-x-2", children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), _jsx("span", { children: "Comparing Image Embeddings..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Sparkles, { className: "w-4 h-4" }), _jsx("span", { children: "Execute Similarity Retrieval" })] })) })] }), _jsxs("div", { className: "lg:col-span-7 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-slate-500", children: [_jsx("span", { className: "font-semibold uppercase tracking-wider text-slate-700", children: "Visual Matches" }), _jsx("span", { className: "font-mono", children: "Sorted by Cosine Similarity" })] }), !hasSearched ? (_jsxs("div", { className: "bg-white border border-slate-200 rounded-lg p-12 text-center flex flex-col items-center justify-center shadow-xs", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-2", children: _jsx(ImageIcon, { className: "w-5 h-5" }) }), _jsx("p", { className: "text-xs font-semibold text-slate-800", children: "No active image query" }), _jsx("p", { className: "text-[11px] text-slate-500 max-w-sm mt-1", children: "Select a visual query patch from the left and click \"Execute Similarity Retrieval\" to match satellite scenes." })] })) : results.length === 0 && !isLoading ? (_jsx("div", { className: "bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-xs", children: "No matching scenes found." })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: results.map((result) => (_jsxs("div", { className: "bg-white border border-slate-200 rounded-lg p-3.5 hover:border-slate-300 transition-all flex flex-col justify-between space-y-3 shadow-xs", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800", children: [Math.round(result.similarity_score * 100), "% Visual Match"] }), _jsx("span", { className: "text-[10px] text-slate-500 font-mono", children: result.metadata?.sensor || 'Sentinel-2' })] }), _jsx("h3", { className: "text-xs font-semibold text-slate-900 truncate", title: result.scene_name, children: result.scene_name }), _jsxs("div", { className: "mt-2 space-y-1 text-[11px] text-slate-600", children: [_jsxs("div", { className: "flex items-center gap-1.5 font-mono", children: [_jsx(MapPin, { className: "w-3 h-3 text-slate-400" }), _jsxs("span", { children: [result.latitude.toFixed(4), ", ", result.longitude.toFixed(4)] })] }), _jsxs("div", { className: "flex items-center gap-1.5 font-mono", children: [_jsx(Calendar, { className: "w-3 h-3 text-slate-400" }), _jsx("span", { children: new Date(result.acquisition_date).toLocaleDateString() })] })] })] }), _jsxs("div", { className: "pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]", children: [_jsxs("span", { className: "text-slate-500 font-mono", children: ["Res: ", result.metadata?.resolution || '10m'] }), _jsxs("span", { className: "text-slate-700 font-medium", children: ["Source: ", result.metadata?.source || 'ESA'] })] })] }, result.scene_id))) }))] })] })] }));
};
export default ImageSearch;
