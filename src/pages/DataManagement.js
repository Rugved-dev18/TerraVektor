import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Database, Plus, Search, History, Check, Loader2, X } from 'lucide-react';
import { getScenes, ingestScene, getSceneProvenance } from '../services/api';
export const DataManagement = () => {
    const [scenes, setScenes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showIngestModal, setShowIngestModal] = useState(false);
    const [selectedProvenance, setSelectedProvenance] = useState(null);
    const [isIngesting, setIsIngesting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    // New Scene Form State
    const [newSceneName, setNewSceneName] = useState('');
    const [newSensor, setNewSensor] = useState('Sentinel-2');
    const [newLat, setNewLat] = useState('18.5204');
    const [newLon, setNewLon] = useState('73.8567');
    const [newCloud, setNewCloud] = useState('5.0');
    const [newSource, setNewSource] = useState('Copernicus CDSE');
    const loadScenes = async () => {
        setIsLoading(true);
        try {
            const data = await getScenes();
            setScenes(data);
        }
        catch (err) {
            console.error('Failed to load scenes:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        loadScenes();
    }, []);
    const handleIngest = async (e) => {
        e.preventDefault();
        setIsIngesting(true);
        try {
            await ingestScene({
                scene_name: newSceneName || `Scene_${Date.now()}`,
                sensor: newSensor,
                latitude: parseFloat(newLat),
                longitude: parseFloat(newLon),
                cloud_percentage: parseFloat(newCloud),
                source: newSource,
                acquisition_date: new Date().toISOString()
            });
            setShowIngestModal(false);
            setNewSceneName('');
            loadScenes();
        }
        catch (err) {
            console.error('Failed to ingest scene:', err);
        }
        finally {
            setIsIngesting(false);
        }
    };
    const handleViewProvenance = async (sceneId) => {
        try {
            const prov = await getSceneProvenance(sceneId);
            setSelectedProvenance(prov);
        }
        catch (err) {
            console.error('Failed to fetch provenance:', err);
        }
    };
    const filteredScenes = scenes.filter(s => s.scene_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.sensor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.source.toLowerCase().includes(searchTerm.toLowerCase()));
    return (_jsxs("div", { className: "p-6 space-y-6 max-w-7xl mx-auto", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1 font-mono", children: [_jsx(Database, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Catalog Ingestion & Provenance Records" })] }), _jsx("h1", { className: "text-xl font-bold text-slate-900 tracking-tight", children: "Scene Registry & Provenance" }), _jsx("p", { className: "text-xs text-slate-600 mt-0.5", children: "Audit catalog scenes, review data lineage pipelines, and manually ingest new satellite datasets." })] }), _jsxs("button", { onClick: () => setShowIngestModal(true), className: "px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center space-x-1.5 self-start", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Ingest New Scene" })] })] }), _jsxs("div", { className: "flex items-center bg-white border border-slate-300 rounded-lg px-3 py-2 max-w-md shadow-xs", children: [_jsx(Search, { className: "w-3.5 h-3.5 text-slate-400 mr-2" }), _jsx("input", { type: "text", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), placeholder: "Filter by scene title, sensor platform, or agency...", className: "bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full" })] }), _jsx("div", { className: "bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-left text-xs text-slate-700", children: [_jsx("thead", { className: "bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3", children: "Scene Identifier" }), _jsx("th", { className: "px-4 py-3", children: "Sensor" }), _jsx("th", { className: "px-4 py-3", children: "Acquisition Date" }), _jsx("th", { className: "px-4 py-3", children: "Coordinates" }), _jsx("th", { className: "px-4 py-3", children: "Cloud Cover" }), _jsx("th", { className: "px-4 py-3", children: "Source" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Lineage" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100", children: isLoading ? (_jsx("tr", { children: _jsxs("td", { colSpan: 7, className: "px-4 py-8 text-center text-slate-500", children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin text-teal-800 mx-auto mb-2" }), _jsx("span", { children: "Loading scene registry..." })] }) })) : filteredScenes.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-4 py-8 text-center text-slate-500", children: "No scenes found matching search criteria." }) })) : (filteredScenes.map((scene) => (_jsxs("tr", { className: "hover:bg-slate-50 transition-colors", children: [_jsx("td", { className: "px-4 py-3 font-semibold text-slate-900 font-mono", children: scene.scene_name }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium", children: scene.sensor }) }), _jsx("td", { className: "px-4 py-3 font-mono text-slate-600", children: new Date(scene.acquisition_date).toLocaleDateString() }), _jsxs("td", { className: "px-4 py-3 font-mono text-slate-600", children: [scene.latitude.toFixed(4), ", ", scene.longitude.toFixed(4)] }), _jsxs("td", { className: "px-4 py-3 font-mono", children: [scene.cloud_percentage, "%"] }), _jsx("td", { className: "px-4 py-3", children: scene.source }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsxs("button", { onClick: () => handleViewProvenance(scene.id), className: "text-xs text-teal-800 hover:text-teal-900 font-semibold inline-flex items-center gap-1", children: [_jsx(History, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Audit Trail" })] }) })] }, scene.id)))) })] }) }) }), showIngestModal && (_jsx("div", { className: "fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white border border-slate-300 rounded-lg max-w-lg w-full p-5 shadow-xl space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-200 pb-3", children: [_jsx("h3", { className: "text-sm font-bold uppercase tracking-wider text-slate-900", children: "Ingest New Satellite Scene" }), _jsx("button", { onClick: () => setShowIngestModal(false), className: "text-slate-400 hover:text-slate-700", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("form", { onSubmit: handleIngest, className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[11px] font-medium text-slate-600 block mb-1", children: "Scene Name / Product Tag" }), _jsx("input", { type: "text", value: newSceneName, onChange: (e) => setNewSceneName(e.target.value), placeholder: "e.g. Pune_Urban_West_2026", className: "w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[11px] font-medium text-slate-600 block mb-1", children: "Sensor" }), _jsxs("select", { value: newSensor, onChange: (e) => setNewSensor(e.target.value), "aria-label": "Sensor", className: "w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700", children: [_jsx("option", { value: "Sentinel-2", children: "Sentinel-2 (MSI)" }), _jsx("option", { value: "Landsat-8", children: "Landsat-8 (OLI)" }), _jsx("option", { value: "Landsat-9", children: "Landsat-9" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[11px] font-medium text-slate-600 block mb-1", children: "Source Agency" }), _jsx("input", { type: "text", value: newSource, onChange: (e) => setNewSource(e.target.value), placeholder: "ESA / Copernicus CDSE", className: "w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700" })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[11px] font-medium text-slate-600 block mb-1", children: "Latitude" }), _jsx("input", { type: "number", step: "any", value: newLat, onChange: (e) => setNewLat(e.target.value), className: "w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[11px] font-medium text-slate-600 block mb-1", children: "Longitude" }), _jsx("input", { type: "number", step: "any", value: newLon, onChange: (e) => setNewLon(e.target.value), className: "w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[11px] font-medium text-slate-600 block mb-1", children: "Cloud %" }), _jsx("input", { type: "number", value: newCloud, onChange: (e) => setNewCloud(e.target.value), className: "w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono" })] })] }), _jsxs("div", { className: "pt-2 flex justify-end gap-2 border-t border-slate-200", children: [_jsx("button", { type: "button", onClick: () => setShowIngestModal(false), className: "px-3 py-1.5 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium", children: "Cancel" }), _jsxs("button", { type: "submit", disabled: isIngesting, className: "px-4 py-1.5 rounded bg-teal-800 text-white text-xs font-semibold hover:bg-teal-900 disabled:opacity-50 flex items-center gap-1.5 shadow-xs", children: [isIngesting ? _jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin" }) : _jsx(Check, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Register Scene" })] })] })] })] }) })), selectedProvenance && (_jsx("div", { className: "fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white border border-slate-300 rounded-lg max-w-xl w-full p-5 shadow-xl space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-200 pb-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-bold uppercase tracking-wider text-slate-900", children: "Data Provenance & Audit Log" }), _jsx("span", { className: "text-xs text-slate-500 font-mono", children: selectedProvenance.scene_name })] }), _jsx("button", { onClick: () => setSelectedProvenance(null), className: "text-slate-400 hover:text-slate-700", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsx("div", { className: "space-y-2.5 max-h-80 overflow-y-auto pr-1", children: selectedProvenance.processing_logs?.map((log) => (_jsxs("div", { className: "p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-bold text-teal-800 uppercase tracking-wider font-mono", children: log.operation }), _jsx("span", { className: "text-[11px] text-slate-500 font-mono", children: new Date(log.timestamp).toLocaleTimeString() })] }), _jsxs("div", { className: "text-[11px] text-slate-700 font-mono break-all bg-white p-2 rounded border border-slate-200", children: ["Model: ", log.model_version, " \u2022 Parameters: ", log.parameters] })] }, log.id))) })] }) }))] }));
};
export default DataManagement;
