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
        self.preview_cache: Dict[str, Dict[str, Any]] = {}
        self.cached_token: Optional[str] = None
        self.token_expiry: float = 0

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

    def create_demo_fallback_svg(self, product_id: str) -> bytes:
        """Create visually distinct fallback SVG for simulated demo products."""
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
          <defs>
            <radialGradient id="spaceGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="100%" stop-color="#090d16"/>
            </radialGradient>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(56,189,248,0.15)" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="512" height="512" fill="url(#spaceGrad)"/>
          <rect width="512" height="512" fill="url(#grid)"/>
          <path d="M 60 200 Q 140 120 220 220 T 380 240 T 480 180 L 480 480 L 60 480 Z" fill="#14532d" opacity="0.45"/>
          <path d="M 40 280 Q 180 220 280 320 T 440 310 L 480 360 L 480 480 L 40 480 Z" fill="#047857" opacity="0.5"/>
          <path d="M 0 340 Q 120 300 240 380 T 480 370 L 480 480 L 0 480 Z" fill="#0284c7" opacity="0.6"/>
          <path d="M 120 512 C 180 400 160 300 320 220 C 400 180 460 160 512 140" fill="none" stroke="#38bdf8" stroke-width="8" opacity="0.7"/>
          <rect x="24" y="24" width="464" height="64" rx="8" fill="rgba(15,23,42,0.85)" stroke="#eab308" stroke-width="2"/>
          <text x="256" y="52" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" fill="#facc15" text-anchor="middle">DEMONSTRATION / FALLBACK SATELLITE SCENE</text>
          <text x="256" y="74" font-family="monospace" font-size="11" fill="#94a3b8" text-anchor="middle">Product ID: {product_id[:32]}</text>
          <rect x="156" y="440" width="200" height="36" rx="6" fill="rgba(2,132,199,0.9)"/>
          <text x="256" y="463" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">Copernicus S2 Sim</text>
        </svg>"""
        return svg.encode('utf-8')

    async def get_preview_image(self, product_id: str) -> tuple[Optional[bytes], str]:
        """Fetch real satellite preview image for Sentinel-2 product ID."""
        if product_id in self.preview_cache:
            entry = self.preview_cache[product_id]
            return entry["data"], entry["content_type"]

        if product_id.startswith("cdse-mock") or product_id.startswith("mock-"):
            svg_data = self.create_demo_fallback_svg(product_id)
            return svg_data, "image/svg+xml"

        # Check CDSE token if available
        auth_token = os.getenv("CDSE_ACCESS_TOKEN")
        if auth_token:
            try:
                import urllib.request
                quicklook_url = f"https://download.dataspace.copernicus.eu/odata/v1/Products({product_id})/Quicklook/$value"
                req = urllib.request.Request(
                    quicklook_url,
                    headers={"Authorization": f"Bearer {auth_token}", "Accept": "image/jpeg, image/png, */*"}
                )
                with urllib.request.urlopen(req, timeout=12) as resp:
                    if resp.status == 200:
                        data = resp.read()
                        ctype = resp.headers.get("Content-Type", "image/jpeg")
                        self.preview_cache[product_id] = {"data": data, "content_type": ctype}
                        return data, ctype
            except Exception as e:
                logger.warning(f"CDSE Quicklook query error for {product_id}: {e}")

        # Fallback to Sentinel-2 open mirror based on product metadata
        try:
            import json
            import urllib.request
            meta_url = f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products({product_id})?$expand=Attributes"
            req = urllib.request.Request(meta_url, headers={"Accept": "application/json", "User-Agent": "TerraVektor/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    meta = json.loads(resp.read().decode('utf-8'))
                    name = meta.get("Name", "")
                    attrs = {a.get("Name"): a.get("Value") for a in meta.get("Attributes", [])}
                    tile = attrs.get("tileId") or (re.search(r'_T([0-9]{2}[A-Z]{3})_', name).group(1) if re.search(r'_T([0-9]{2}[A-Z]{3})_', name) else None)
                    acq = meta.get("ContentDate", {}).get("Start") or meta.get("OriginDate")

                    if tile and len(tile) == 5 and acq:
                        utm = tile[:2]
                        lat_band = tile[2:3]
                        square = tile[3:5]
                        clean_date = acq[:10].replace("-", "")
                        year = clean_date[:4]
                        month = str(int(clean_date[4:6]))
                        platform = "S2A" if name.startswith("S2A") else "S2B"
                        mirror_url = f"https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/{utm}/{lat_band}/{square}/{year}/{month}/{platform}_{tile}_{clean_date}_0_L2A/thumbnail.jpg"

                        mirror_req = urllib.request.Request(mirror_url)
                        with urllib.request.urlopen(mirror_req, timeout=12) as m_resp:
                            if m_resp.status == 200:
                                data = m_resp.read()
                                self.preview_cache[product_id] = {"data": data, "content_type": "image/jpeg"}
                                return data, "image/jpeg"
        except Exception as e:
            logger.warning(f"Failed resolving preview image for {product_id}: {e}")

        return None, ""

