# Sentinel-2 & Satellite Data Processing Reference

## 1. Sentinel-2 Constellation Overview

Sentinel-2 is a European wide-swath, high-resolution, multi-spectral imaging mission comprising two identical satellites (Sentinel-2A and Sentinel-2B) operated by ESA under the European Union's Copernicus Programme.

- **Revisit Frequency**: 5 days at equator (with 2 satellites in constellation).
- **Processing Levels**:
  - `S2MSI1C` (Level-1C): Top-of-Atmosphere (TOA) reflectance with sub-pixel coregistration.
  - `S2MSI2A` (Level-2A): Bottom-of-Atmosphere (BOA) surface reflectance with atmospheric correction. TerraVektor prioritizes L2A for physical index calculations.

## 2. Copernicus Data Space Ecosystem (CDSE) OData API

TerraVektor discovers Sentinel-2 products directly from the official CDSE OData catalogue:
- **Base Endpoint**: `https://catalogue.dataspace.copernicus.eu/odata/v1/Products`
- **Authentication**: Keycloak OpenID Connect endpoint (`identity.dataspace.copernicus.eu`) via client credentials or user password flow.
- **Spatial Filters**: Uses `OData.CSC.Intersects` with WKT polygons in SRID=4326.
- **Attributes Filter**: Filters `Collection/Name eq 'SENTINEL-2'`, `productType eq 'S2MSI2A'`, and `cloudCover le <threshold>`.

## 3. Spectral Bands Used

| Band | Name | Central Wavelength | Spatial Resolution | Physical Use |
|---|---|---|---|---|
| **B04** | Red | ~665 nm | 10 m | Chlorophyll absorption |
| **B08** | Near-Infrared (NIR) | ~842 nm | 10 m | Leaf cell structure reflection |
| **B11** | Short-Wave IR (SWIR-1) | ~1610 nm | 20 m | Impervious built-up surface reflection & soil moisture |

## 4. Spectral Indices Calculated

### 4.1 Normalized Difference Vegetation Index (NDVI)
Quantifies photosynthetic vegetation density:
$$\text{NDVI} = \frac{\text{B08} - \text{B04}}{\text{B08} + \text{B04}}$$
- Healthy green vegetation: $0.4 \le \text{NDVI} \le 0.85$
- Water bodies: $\text{NDVI} < 0$
- Bare soil / built-up: $0.05 \le \text{NDVI} \le 0.2$

### 4.2 Normalized Difference Built-Up Index (NDBI)
Highlights impervious urban structures and building density:
$$\text{NDBI} = \frac{\text{B11} - \text{B08}}{\text{B11} + \text{B08}}$$
- Concrete, asphalt, and built structures exhibit higher reflectance in SWIR (B11) than in NIR (B08), yielding positive NDBI values.

### 4.3 Pairwise Built-Up Expansion Detection
TerraVektor identifies new construction by looking for simultaneous:
1. Significant increase in built-up signature: $\Delta\text{NDBI} = \text{NDBI}_{\text{after}} - \text{NDBI}_{\text{before}} > \tau_{\text{NDBI}}$
2. Loss of previous vegetation canopy or bare land: $\Delta\text{NDVI} = \text{NDVI}_{\text{after}} - \text{NDVI}_{\text{before}} < -\tau_{\text{NDVI}}$

### 4.4 Normalized Difference Water Index (NDWI & MNDWI) & Land/Water Masking
To prevent aquatic reflections, wave glint, sediment shifts, and coastal dynamics from generating false-positive construction candidates over oceans, lakes, and rivers, TerraVektor enforces a deterministic multi-spectral water exclusion mask:

$$\text{NDWI} = \frac{\text{B03} - \text{B08}}{\text{B03} + \text{B08}}$$
$$\text{MNDWI} = \frac{\text{B03} - \text{B11}}{\text{B03} + \text{B11}}$$

- **Water Discrimination**: Pixels exhibit $\text{NDWI} > 0$ or $\text{MNDWI} > 0$, coupled with strong absorption in near-infrared ($\text{B08} < 0.10$ reflectance).
- **Multi-Temporal Water Exclusion**: If a pixel is identified as water in either the baseline or monitoring acquisition, it is strictly excluded from candidate clustering.
- **Land-Only Analysis Space**: Built-up index differencing ($\Delta\text{NDBI}$) is evaluated exclusively over verified land surface pixels.

## 5. Important Scientific & Data Limitations

1. **Cloud & Shadow Contamination**: Clouds yield high reflectance across visible and infrared channels, while cloud shadows mimic deep water or wet soil. Scenes should be filtered to $\le 20\%$ cloud cover.
2. **Phenological vs. Anthropogenic Change**: Seasonal crop harvesting or monsoon cycles produce substantial NDVI drops that are not new buildings. NDBI confirmation helps distinguish soil drying from true impervious surfaces.
3. **Resolution Granularity**: Sentinel-2 pixels are 10 m (visible/NIR) and 20 m (SWIR). Features smaller than $100\text{ m}^2$ (individual small residential houses) may appear as mixed pixels.
4. **Band 11 Resampling**: SWIR Band 11 is collected at 20 m resolution and must be resampled/interpolated when combined with 10 m Band 04 and Band 08.
