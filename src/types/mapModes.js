export const MAP_COLOR_MODES = {
    'optical-rgb': {
        id: 'optical-rgb',
        name: 'Optical RGB',
        shortName: 'Optical RGB',
        tagline: 'Natural True Color Composite',
        bands: 'B04 (Red), B03 (Green), B02 (Blue)',
        sensor: 'Sentinel-2 MSI / Landsat-8 OLI',
        wavelength: '490 nm – 665 nm (Visible Spectrum)',
        description: 'Direct atmospheric-corrected surface reflectance matching human optical perception. Optimal for visual baseline validation, road networks, and natural land cover classification.',
        paletteTheme: 'emerald',
        badgeBg: 'bg-emerald-50',
        badgeText: 'text-emerald-900',
        badgeBorder: 'border-emerald-300',
        legend: [
            { label: 'Vegetation / Canopy', color: '#15803d', description: 'Chlorophyllic green' },
            { label: 'Built-up / Concrete', color: '#94a3b8', description: 'Neutral gray / slate' },
            { label: 'Water Bodies', color: '#0284c7', description: 'Deep blue / azure' },
            { label: 'Bare Soil / Sand', color: '#d97706', description: 'Ochre / tan / brown' }
        ]
    },
    'c-band-sar': {
        id: 'c-band-sar',
        name: 'C-Band SAR',
        shortName: 'C-Band SAR',
        tagline: 'Microwave Radar Backscatter (VV/VH)',
        bands: 'C-Band Radar (5.405 GHz)',
        sensor: 'Sentinel-1 C-SAR (Co-pol VV / Cross-pol VH)',
        wavelength: '5.5 cm (Microwave, all-weather penetrating)',
        description: 'Active synthetic aperture radar imaging measuring dielectric roughness and geometric corner reflection. Penetrates cloud cover and atmospheric haze. High-density structures cause intense double-bounce backscatter; calm water exhibits specular bounce away from antenna.',
        paletteTheme: 'slate',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-950',
        badgeBorder: 'border-amber-300',
        legend: [
            { label: 'Urban / Metallic Structures', color: '#facc15', description: 'High-intensity double-bounce specular peak' },
            { label: 'Rough Canopy / Crops', color: '#65a30d', description: 'Diffuse volume scattering & radar speckle' },
            { label: 'Calm Water / Smooth Surfaces', color: '#090d16', description: 'Specular deflection away (deep black absorption)' },
            { label: 'Bare Earth / Tarmac', color: '#475569', description: 'Low-to-medium roughness backscatter' }
        ]
    },
    'false-color-nir': {
        id: 'false-color-nir',
        name: 'False Colour NIR',
        shortName: 'Color NIR (CIR)',
        tagline: 'Near-Infrared Vegetation Stress & Biomass',
        bands: 'B08 (NIR) → Red, B04 (Red) → Green, B03 (Green) → Blue',
        sensor: 'Sentinel-2 MSI (Color-Infrared CIR)',
        wavelength: '560 nm (B3) to 842 nm (B8 NIR)',
        description: 'Earth Observation standard Color-Infrared (CIR) composite. Healthy cellular plant structures exhibit high reflectance on the NIR plateau, appearing in vivid crimson red. Water absorbs NIR completely, appearing deep navy-black. Urban and barren soils appear cyan and pale pink.',
        paletteTheme: 'rose',
        badgeBg: 'bg-rose-50',
        badgeText: 'text-rose-950',
        badgeBorder: 'border-rose-300',
        legend: [
            { label: 'Dense Vegetation / Canopy', color: '#dc2626', description: 'Intense crimson red (high chlorophyllic NIR reflection)' },
            { label: 'Urban / Built Structures', color: '#38bdf8', description: 'Cyan / silvery blue / cool slate' },
            { label: 'Water / High Moisture', color: '#090e17', description: 'Near-total NIR absorption (pitch black / navy)' },
            { label: 'Barren Soil / Clearings', color: '#f472b6', description: 'Pale pink / beige / light tan' }
        ]
    }
};
