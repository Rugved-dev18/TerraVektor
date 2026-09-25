import os
import re
import time
import logging
from typing import Dict, Any, List, Optional
import urllib.parse

logger = logging.getLogger(__name__)

class Sentinel2Service:
    """Service to search Sentinel-2 imagery via the Copernicus Data Space Ecosystem OData API."""

    def __init__(self):
        self.base_url = os.getenv(
            "COPERNICUS_CDSE_CATALOGUE_URL",
            "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
        )

    def parse_wkt_polygon(self, wkt_str: Optional[str]) -> Dict[str, Any]:
        """Convert WKT string to GeoJSON polygon, bounding box, and centroid."""
        if not wkt_str:
            return {
                "geometry": {"type": "Polygon", "coordinates": [[]]},
                "bbox": [0.0, 0.0, 0.0, 0.0],
                "center": [0.0, 0.0]
            }

        try:
            match = re.search(r'\(\s*\((.*?)\)\s*\)', wkt_str) or re.search(r'\((.*?)\)', wkt_str)
            if not match:
                return {
                    "geometry": {"type": "Polygon", "coordinates": [[]]},
                    "bbox": [0.0, 0.0, 0.0, 0.0],
                    "center": [0.0, 0.0]
                }

            coords_str = match.group(1)
            pairs = coords_str.split(',')
            ring = []
            min_lon, min_lat = float('inf'), float('inf')
            max_lon, max_lat = float('-inf'), float('-inf')

            for pair in pairs:
                parts = pair.strip().split()
                if len(parts) >= 2:
                    lon = float(parts[0])
                    lat = float(parts[1])
                    ring.append([lon, lat])
                    min_lon = min(min_lon, lon)
                    max_lon = max(max_lon, lon)
                    min_lat = min(min_lat, lat)
                    max_lat = max(max_lat, lat)

            if not ring:
                return {
                    "geometry": {"type": "Polygon", "coordinates": [[]]},
                    "bbox": [0.0, 0.0, 0.0, 0.0],
                    "center": [0.0, 0.0]
                }

            return {
                "geometry": {"type": "Polygon", "coordinates": [ring]},
                "bbox": [min_lon, min_lat, max_lon, max_lat],
                "center": [(min_lon + max_lon) / 2.0, (min_lat + max_lat) / 2.0]
            }
        except Exception as e:
            logger.warning(f"Error parsing WKT footprint: {e}")
            return {
                "geometry": {"type": "Polygon", "coordinates": [[]]},
                "bbox": [0.0, 0.0, 0.0, 0.0],
                "center": [0.0, 0.0]
            }

    def build_odata_filter(
        self,
        start_date: str,
        end_date: str,
        max_cloud_cover: float,
        product_type: Optional[str] = None,
        bbox: Optional[List[float]] = None,
        geojson_polygon: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build OData filter query string for Copernicus Data Space Ecosystem."""
        filters = [
            "Collection/Name eq 'SENTINEL-2'",
            f"ContentDate/Start ge {start_date}T00:00:00.000Z",
            f"ContentDate/Start le {end_date}T23:59:59.999Z"
        ]

        if product_type == "S2MSI2A":
            filters.append("contains(Name, 'MSIL2A')")
        elif product_type == "S2MSI1C":
            filters.append("contains(Name, 'MSIL1C')")

        if max_cloud_cover < 100:
            filters.append(
                f"Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' and att/OData.CSC.DoubleAttribute/Value le {max_cloud_cover})"
            )

        # Spatial AOI intersection
        if bbox:
            min_lon, min_lat, max_lon, max_lat = bbox
            aoi_wkt = f"POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"
            filters.append(f"OData.CSC.Intersects(area=geography'SRID=4326;{aoi_wkt}')")
        elif geojson_polygon and "coordinates" in geojson_polygon and geojson_polygon["coordinates"]:
            ring = geojson_polygon["coordinates"][0]
            points_str = ", ".join([f"{pt[0]} {pt[1]}" for pt in ring])
            aoi_wkt = f"POLYGON(({points_str}))"
            filters.append(f"OData.CSC.Intersects(area=geography'SRID=4326;{aoi_wkt}')")

        return " and ".join(filters)
