import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Embedded SVG Filter Definitions for Earth Observation Map Spectral Changing Modes:
 * 1. Optical RGB: Default natural human perception
 * 2. C-Band SAR: Sentinel-1 5.4 GHz microwave radar backscatter (VV/VH dual-pol, speckle, double bounce)
 * 3. False Colour NIR: Sentinel-2 B08-B04-B03 Color-Infrared (CIR) composite
 */
export const MapColorFilters = () => {
    return (_jsx("svg", { className: "absolute top-0 left-0 w-0 h-0 pointer-events-none -z-50 select-none overflow-hidden", "aria-hidden": "true", style: { position: 'absolute', width: 0, height: 0 }, children: _jsxs("defs", { children: [_jsx("filter", { id: "terravektor-optical-rgb", colorInterpolationFilters: "sRGB", children: _jsx("feColorMatrix", { type: "identity" }) }), _jsxs("filter", { id: "terravektor-cband-sar", colorInterpolationFilters: "sRGB", x: "-5%", y: "-5%", width: "110%", height: "110%", children: [_jsx("feColorMatrix", { type: "matrix", values: "\r\n              0.35  0.55  0.10  0  -0.08\r\n              0.30  0.50  0.10  0  -0.08\r\n              0.25  0.45  0.20  0  -0.05\r\n              0     0     0     1   0", result: "backscatter" }), _jsxs("feComponentTransfer", { in: "backscatter", result: "contrastStretched", children: [_jsx("feFuncR", { type: "linear", slope: "1.45", intercept: "-0.12" }), _jsx("feFuncG", { type: "linear", slope: "1.40", intercept: "-0.12" }), _jsx("feFuncB", { type: "linear", slope: "1.50", intercept: "-0.10" })] }), _jsx("feColorMatrix", { in: "contrastStretched", type: "matrix", values: "\r\n              1.10  0.10 -0.05  0  0.02\r\n              0.05  1.15  0.00  0  0.03\r\n             -0.10  0.15  1.20  0  0.04\r\n              0     0     0     1  0", result: "radarColored" }), _jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.65", numOctaves: "3", stitchTiles: "stitch", result: "speckle" }), _jsx("feColorMatrix", { in: "speckle", type: "matrix", values: "\r\n              0.15 0 0 0 0.85\r\n              0 0.15 0 0 0.85\r\n              0 0 0.15 0 0.85\r\n              0 0 0 1 0", result: "speckleNoise" }), _jsx("feBlend", { in: "radarColored", in2: "speckleNoise", mode: "multiply", result: "sarOutput" })] }), _jsxs("filter", { id: "terravektor-false-color-nir", colorInterpolationFilters: "sRGB", x: "0%", y: "0%", width: "100%", height: "100%", children: [_jsx("feColorMatrix", { type: "matrix", values: "\r\n             -0.35   1.75  -0.30   0   0.05\r\n              0.75   0.25   0.00   0  -0.02\r\n             -0.20   0.30   0.70   0   0.08\r\n              0      0      0      1   0", result: "cirRaw" }), _jsxs("feComponentTransfer", { in: "cirRaw", result: "cirEnhanced", children: [_jsx("feFuncR", { type: "linear", slope: "1.25", intercept: "-0.04" }), _jsx("feFuncG", { type: "linear", slope: "1.05", intercept: "-0.02" }), _jsx("feFuncB", { type: "linear", slope: "1.15", intercept: "-0.03" })] })] })] }) }));
};
/**
 * Returns the CSS class or inline filter style string for the given MapColorMode
 */
export function getMapColorFilterStyle(mode) {
    switch (mode) {
        case 'c-band-sar':
            return {
                filter: 'url(#terravektor-cband-sar) contrast(1.15) brightness(0.98)',
                WebkitFilter: 'url(#terravektor-cband-sar) contrast(1.15) brightness(0.98)',
                transition: 'filter 0.3s ease-in-out'
            };
        case 'false-color-nir':
            return {
                filter: 'url(#terravektor-false-color-nir) saturate(1.25) contrast(1.1)',
                WebkitFilter: 'url(#terravektor-false-color-nir) saturate(1.25) contrast(1.1)',
                transition: 'filter 0.3s ease-in-out'
            };
        case 'optical-rgb':
        default:
            return {
                filter: 'none',
                WebkitFilter: 'none',
                transition: 'filter 0.3s ease-in-out'
            };
    }
}
/**
 * Returns the CSS class name for the active map color mode
 */
export function getMapColorFilterClassName(mode) {
    switch (mode) {
        case 'c-band-sar':
            return 'map-mode-c-band-sar';
        case 'false-color-nir':
            return 'map-mode-false-color-nir';
        case 'optical-rgb':
        default:
            return 'map-mode-optical-rgb';
    }
}
