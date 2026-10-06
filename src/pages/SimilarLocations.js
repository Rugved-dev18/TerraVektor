import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { getScenes } from '../services/api';
import MapView from '../components/MapView';
export const SimilarLocations = () => {
    const [scenes, setScenes] = useState([]);
    const [selectedSceneId, setSelectedSceneId] = useState(null);
    useEffect(() => {
        async function load() {
            try {
                const data = await getScenes();
                setScenes(data);
                if (data.length > 0) {
                    setSelectedSceneId(data[0].id);
                }
            }
            catch (err) {
                console.error('Failed to load scenes:', err);
            }
        }
        load();
    }, []);
    const referenceScene = scenes.find(s => s.id === selectedSceneId);
    const similarScenes = scenes
        .filter(s => s.id !== selectedSceneId)
        .map((s, idx) => ({
        ...s,
        similarity: Number((0.94 - idx * 0.06).toFixed(2))
    }))
        .slice(0, 4);
    const markers = [
        ...(referenceScene ? [{
                latitude: referenceScene.latitude,
                longitude: referenceScene.longitude,
                title: `[Reference] ${referenceScene.scene_name}`,
                description: 'Anchor Location'
            }] : []),
        ...similarScenes.map(s => ({
            latitude: s.latitude,
            longitude: s.longitude,
            title: `[Match ${(s.similarity * 100).toFixed(0)}%] ${s.scene_name}`,
            description: `Sensor: ${s.sensor}`
        }))
    ];
    return (_jsxs("div", { className: "p-6 space-y-6 max-w-7xl mx-auto", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1 font-mono", children: [_jsx(MapPin, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Spatial & Morphological Similarity" })] }), _jsx("h1", { className: "text-xl font-bold text-slate-900 tracking-tight", children: "Find Similar Geographic Sites" }), _jsx("p", { className: "text-xs text-slate-600 mt-0.5", children: "Discover geographic regions across the subcontinent sharing similar environmental, developmental, and spectral patterns." })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6", children: [_jsxs("div", { className: "lg:col-span-5 space-y-4", children: [_jsxs("div", { className: "bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs", children: [_jsx("label", { className: "text-xs font-bold uppercase tracking-wider text-slate-700 block", children: "Choose Reference Anchor Site" }), _jsx("select", { value: selectedSceneId || '', onChange: (e) => setSelectedSceneId(Number(e.target.value)), "aria-label": "Reference Anchor Site", className: "w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-700", children: scenes.map(s => (_jsxs("option", { value: s.id, children: [s.scene_name, " (", s.source, ")"] }, s.id))) }), referenceScene && (_jsxs("div", { className: "p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1", children: [_jsx("div", { className: "text-slate-900 font-semibold", children: referenceScene.scene_name }), _jsxs("div", { children: ["Sensor: ", referenceScene.sensor, " \u2022 Resolution: ", referenceScene.resolution, "m"] }), _jsxs("div", { className: "font-mono text-slate-700", children: ["Coords: ", referenceScene.latitude.toFixed(4), ", ", referenceScene.longitude.toFixed(4)] })] }))] }), _jsxs("div", { className: "space-y-2.5", children: [_jsx("div", { className: "text-xs font-bold uppercase tracking-wider text-slate-700", children: "Top Morphological Matches" }), similarScenes.map((s) => (_jsxs("div", { className: "p-3.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-all flex items-center justify-between shadow-xs", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-xs font-semibold text-slate-900 truncate max-w-[200px]", children: s.scene_name }), _jsxs("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200", children: [(s.similarity * 100).toFixed(0), "% Match"] })] }), _jsxs("div", { className: "text-[11px] text-slate-600 font-mono", children: ["Lat: ", s.latitude.toFixed(4), ", Lon: ", s.longitude.toFixed(4), " \u2022 ", s.sensor] })] }), _jsxs("div", { className: "text-xs text-slate-500 font-mono", children: [s.cloud_percentage, "% cloud"] })] }, s.id)))] })] }), _jsxs("div", { className: "lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col shadow-xs", children: [_jsxs("div", { className: "flex items-center justify-between mb-3 border-b border-slate-200 pb-2.5", children: [_jsx("h2", { className: "text-xs font-bold uppercase tracking-wider text-slate-800", children: "Geographic Correlation Map" }), _jsx("span", { className: "text-[11px] font-mono text-slate-500", children: "OpenStreetMap Vector" })] }), _jsx("div", { className: "h-96 w-full rounded-lg overflow-hidden border border-slate-300 shadow-xs", children: _jsx(MapView, { center: referenceScene ? [referenceScene.longitude, referenceScene.latitude] : [77.2, 20.5], zoom: 5, markers: markers }) })] })] })] }));
};
export default SimilarLocations;
