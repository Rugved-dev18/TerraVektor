import os
import logging
import numpy as np
import rasterio
from rasterio.windows import transform
from rasterio.features import geometry_window
from shapely.geometry import box, mapping
from typing import Dict, Any, Tuple, Optional
import time

logger = logging.getLogger(__name__)

class ChangeDetectionService:
    """Service for real Sentinel-2 multi-temporal change detection using actual B4/B8 spectral bands."""
    
    def __init__(self):
        self.cog_base_url = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs"
        self.processing_cache: Dict[str, Dict[str, Any]] = {}
    
    def parse_product_name(self, product_name: str) -> Dict[str, Any]:
        """Parse Sentinel-2 product name to extract tile, date, platform."""
        # Example: S2A_MSIL2A_20240503T052651_N0510_R105_T43QCA_20240503T075853.SAFE
        parts = product_name.replace('.SAFE', '').split('_')
        
        return {
            'platform': parts[0],
            'product_type': parts[1],
            'sensing_time': parts[2],
            'processing_baseline': parts[3],
            'orbit': parts[4],
            'tile_id': parts[5],
            'product_id': parts[6] if len(parts) > 6 else ''
        }
    
    def get_cog_url(self, product_name: str, band: str) -> str:
        """Generate COG URL for a specific band."""
        # COG URL pattern: sentinel-s2-l2a-cogs/{UTM}/{lat_band}/{square}/{year}/{month}/{platform}_{tile}_{date}_0_L2A/{band}.tif
        parsed = self.parse_product_name(product_name)
        
        # Extract components
        tile = parsed['tile_id']  # e.g., 43QCA
        utm = tile[:2]  # e.g., 43
        lat_band = tile[2:3]  # e.g., Q
        square = tile[3:5]  # e.g., CA
        
        # Parse date from sensing_time: 20240503T052651
        date_str = parsed['sensing_time'][:8]  # 20240503
        year = date_str[:4]  # 2024
        month = str(int(date_str[4:6]))  # 5
        
        platform = parsed['platform']  # S2A
        clean_date = date_str  # 20240503
        
        url = f"{self.cog_base_url}/{utm}/{lat_band}/{square}/{year}/{month}/{platform}_{tile}_{clean_date}_0_L2A/{band}.tif"
        return url
    
    def download_cog_subset(self, url: str, bbox: Tuple[float, float, float, float], target_crs: str = "EPSG:4326") -> Tuple[np.ndarray, Dict[str, Any]]:
        """Download and crop COG to AOI bounding box."""
        min_lon, min_lat, max_lon, max_lat = bbox
        
        # Create polygon from bbox
        polygon = box(min_lon, min_lat, max_lon, max_lat)
        
        # Use GDAL's /vsicurl/ for direct HTTP access
        vsi_url = f"/vsicurl/{url}"
        
        try:
            with rasterio.Env(AWS_NO_SIGN_REQUEST="YES", GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"):
                with rasterio.open(vsi_url) as src:
                    # Get window for AOI
                    window = geometry_window(src, [mapping(polygon)])
                    window_transform = transform(window, src.transform)
                    
                    # Read data
                    data = src.read(1, window=window, out_dtype=np.float32)
                    
                    # Transform window to coordinates
                    transform_bounds = rasterio.windows.transform_bounds(window_transform, src.crs, target_crs)
                    
                    return data, {
                        'crs': src.crs,
                        'transform': src.transform,
                        'width': src.width,
                        'height': src.height,
                        'window_bounds': transform_bounds,
                        'nodata': src.nodata
                    }
        except Exception as e:
            logger.error(f"Failed to read COG from {url}: {e}")
            raise
    
    def calculate_ndvi(self, red_band: np.ndarray, nir_band: np.ndarray) -> np.ndarray:
        """Calculate NDVI from Red (B4) and NIR (B8) bands.
        
        NDVI = (NIR - Red) / (NIR + Red)
        """
        
        # Handle divide by zero and invalid values
        ndvi = np.where(
            (nir_band + red_band) == 0,
            np.nan,
            ndvi
        )
        
        # NDVI should be in range [-1, 1]
        ndvi = np.clip(ndvi, -1, 1)
        
        return ndvi
    
    def detect_changes(
        self,
        before_product_name: str,
        after_product_name: str,
        bbox: Tuple[float, float, float, float],
        change_threshold: float = 0.2
    ) -> Dict[str, Any]:
        """Perform real change detection using actual B4/B8 spectral bands."""
        
        start_time = time.time()
        
        try:
            # Get COG URLs for B04 and B8 bands
            before_b04_url = self.get_cog_url(before_product_name, "B04")
            before_b08_url = self.get_cog_url(before_product_name, "B08")
            after_b04_url = self.get_cog_url(after_product_name, "B04")
            after_b08_url = self.get_cog_url(after_product_name, "B08")
            
            logger.info(f"Processing change detection for {before_product_name} vs {after_product_name}")
            logger.info(f"Before B04: {before_b04_url}")
            logger.info(f"After B04: {after_b04_url}")
            
            # Download and crop bands to AOI
            before_red, before_meta = self.download_cog_subset(before_b04_url, bbox)
            before_nir, _ = self.download_cog_subset(before_b08_url, bbox)
            after_red, after_meta = self.download_cog_subset(after_b04_url, bbox)
            after_nir, _ = self.download_cog_subset(after_b08_url, bbox)
            
            # Calculate NDVI for both scenes
            before_ndvi = self.calculate_ndvi(before_red, before_nir)
            after_ndvi = self.calculate_ndvi(after_red, after_nir)
            
            # Calculate NDVI difference
            ndvi_diff = after_ndvi - before_ndvi
            
            # Generate change mask based on threshold
            change_mask = np.where(
                np.abs(ndvi_diff) > change_threshold,
                1,
                0
            )
            
            # Calculate statistics
            total_pixels = np.sum(~np.isnan(before_ndvi) & ~np.isnan(after_ndvi))
            changed_pixels = np.sum(change_mask == 1)
            unchanged_pixels = total_pixels - changed_pixels
            
            change_percentage = (changed_pixels / total_pixels) if total_pixels > 0 else 0.0
            
            before_mean_ndvi = np.nanmean(before_ndvi)
            after_mean_ndvi = np.nanmean(after_ndvi)
            mean_ndvi_diff = np.nanmean(ndvi_diff)
            
            processing_time_ms = (time.time() - start_time) * 1000
            
            result = {
                'success': True,
                'data_mode': 'real_sentinel2',
                'source': 'public_cog_mirror',
                'before_product_name': before_product_name,
                'after_product_name': after_product_name,
                'bands': ['B04', 'B08'],
                'aoi_bbox': bbox,
                'crs': before_meta['crs'],
                'resolution': 10.0,  # Sentinel-2 L2A is 10m
                'change_threshold': change_threshold,
                'statistics': {
                    'total_valid_pixels': int(total_pixels),
                    'changed_pixels': int(changed_pixels),
                    'unchanged_pixels': int(unchanged_pixels),
                    'change_percentage': float(change_percentage),
                    'before_mean_ndvi': float(before_mean_ndvi),
                    'after_mean_ndvi': float(after_mean_ndvi),
                    'mean_ndvi_difference': float(mean_ndvi_diff)
                },
                'processing_time_ms': float(processing_time_ms),
                'processing_timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ')
            }
            
            logger.info(f"Change detection completed: {change_percentage:.2%} change in {processing_time_ms:.0f}ms")
            return result
            
        except Exception as e:
            logger.error(f"Change detection failed: {e}")
            return {
                'success': False,
                'data_mode': 'processing_unavailable',
                'reason': str(e),
                'failed_source': 'public_cog_mirror',
                'required_next_step': 'Check COG URL format and network connectivity'
            }