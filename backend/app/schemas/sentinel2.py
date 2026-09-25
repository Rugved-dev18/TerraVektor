from typing import List, Optional, Tuple, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime

class GeoJSONPolygon(BaseModel):
    type: str = "Polygon"
    coordinates: List[List[List[float]]]

class Sentinel2SearchRequest(BaseModel):
    bbox: Optional[List[float]] = Field(
        None, 
        description="Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326"
    )
    geojson_polygon: Optional[GeoJSONPolygon] = Field(
        None,
        description="GeoJSON Polygon for complex AOI selection"
    )
    start_date: str = Field(..., description="Start acquisition date YYYY-MM-DD")
    end_date: str = Field(..., description="End acquisition date YYYY-MM-DD")
    max_cloud_cover: float = Field(
        100.0,
        ge=0.0,
        le=100.0,
        description="Maximum acceptable cloud coverage percentage (0.0 - 100.0)"
    )
    product_type: Optional[str] = Field(
        "ALL",
        description="Sentinel-2 product type: S2MSI2A (Level-2A), S2MSI1C (Level-1C), or ALL"
    )
    limit: Optional[int] = Field(
        20,
        ge=1,
        le=50,
        description="Maximum number of products to return"
    )

    @validator('start_date', 'end_date')
    def validate_date_format(cls, v):
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError("Date must be in format YYYY-MM-DD or ISO 8601")
        return v

    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values:
            s_str = values['start_date']
            try:
                d1 = datetime.fromisoformat(s_str.replace('Z', '+00:00'))
                d2 = datetime.fromisoformat(v.replace('Z', '+00:00'))
                if d1 > d2:
                    raise ValueError("start_date must be earlier than or equal to end_date")
            except ValueError:
                pass
        return v

    @validator('bbox')
    def validate_bbox(cls, v):
        if v is not None:
            if len(v) != 4:
                raise ValueError("bbox must contain exactly 4 coordinates [minLon, minLat, maxLon, maxLat]")
            min_lon, min_lat, max_lon, max_lat = v
            if min_lon >= max_lon or min_lat >= max_lat:
                raise ValueError("bbox minLon must be < maxLon and minLat must be < maxLat")
            if min_lon < -180 or max_lon > 180 or min_lat < -90 or max_lat > 90:
                raise ValueError("bbox coordinates must be within standard WGS84 bounds")
        return v

class Sentinel2Product(BaseModel):
    id: str
    name: str
    product_type: str
    acquisition_date: str
    cloud_cover: float
    platform: str
    tile_id: Optional[str] = None
    footprint_wkt: Optional[str] = None
    geometry: Dict[str, Any]
    bbox: List[float]
    center: List[float]
    data_mode: str = "live_copernicus"
    download_url: str
    cdse_browser_url: str
    origin: str
    content_length_bytes: Optional[int] = 0
    metadata: Optional[Dict[str, Any]] = None

class Sentinel2SearchResponse(BaseModel):
    total_results: int
    results: List[Sentinel2Product]
    query_params: Dict[str, Any]
    source: str
    data_mode: str = "live_copernicus"
    api_endpoint: str = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
    odata_filter: Optional[str] = None
    execution_time_ms: float
    message: Optional[str] = None
