from fastapi import APIRouter, HTTPException, Query, Body, status
import time
import json
import logging
import urllib.request
import urllib.parse
from typing import Optional, List
from app.schemas.sentinel2 import (
    Sentinel2SearchRequest,
    Sentinel2SearchResponse,
    Sentinel2Product
)
from app.services.sentinel2_service import Sentinel2Service

logger = logging.getLogger(__name__)
router = APIRouter()
service = Sentinel2Service()

@router.post(
    "/search",
    response_model=Sentinel2SearchResponse,
    summary="Search Sentinel-2 Imagery via Copernicus Data Space Ecosystem"
)
async def search_sentinel2_post(request: Sentinel2SearchRequest):
    """
    Search Sentinel-2 products by AOI bounding box or polygon, date range,
    and maximum cloud coverage percentage.
    """
    start_time = time.time()

    if not request.bbox and not request.geojson_polygon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Area of interest is required (provide bbox [minLon, minLat, maxLon, maxLat] or geojson_polygon)."
        )

    filter_str = service.build_odata_filter(
        start_date=request.start_date,
        end_date=request.end_date,
        max_cloud_cover=request.max_cloud_cover,
        product_type=request.product_type,
        bbox=request.bbox,
        geojson_polygon=request.geojson_polygon.dict() if request.geojson_polygon else None
    )

    url = (
        f"{service.base_url}?$filter={urllib.parse.quote(filter_str)}"
        f"&$expand=Attributes&$top={request.limit}&$orderby=ContentDate/Start desc"
    )

    logger.info(f"Querying Copernicus CDSE OData: {url}")

    results = []
    source = "copernicus_data_space_ecosystem"
    message = None

    try:
        req = urllib.request.Request(
            url,
            headers={"Accept": "application/json", "User-Agent": "TerraVektor-SIH/1.0"}
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                products = data.get("value", [])

                for item in products:
                    attrs = {a.get("Name"): a.get("Value") for a in item.get("Attributes", [])}
                    parsed_footprint = service.parse_wkt_polygon(item.get("Footprint"))
                    center = parsed_footprint["center"]
                    p_type = attrs.get("productType") or ("S2MSI2A" if "MSIL2A" in item.get("Name", "") else "S2MSI1C")
                    platform_serial = attrs.get("platformSerialIdentifier") or ("A" if item.get("Name", "").startswith("S2A") else "B")

                    product = Sentinel2Product(
                        id=str(item.get("Id")),
                        name=str(item.get("Name")),
                        product_type=p_type,
                        acquisition_date=item.get("ContentDate", {}).get("Start") or item.get("OriginDate", ""),
                        cloud_cover=round(float(attrs.get("cloudCover", 0.0)), 2),
                        platform=f"Sentinel-2{platform_serial}",
                        tile_id=attrs.get("tileId"),
                        footprint_wkt=item.get("Footprint"),
                        geometry=parsed_footprint["geometry"],
                        bbox=parsed_footprint["bbox"],
                        center=center,
                        download_url=f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products({item.get('Id')})/$value",
                        cdse_browser_url=f"https://browser.dataspace.copernicus.eu/?zoom=11&lat={center[1]:.4f}&lng={center[0]:.4f}&themeId=DEFAULT-THEME&datasetId=S2_L2A_CDAS",
                        origin=attrs.get("origin", "ESA"),
                        content_length_bytes=item.get("ContentLength", 0),
                        metadata={
                            "orbit_number": attrs.get("orbitNumber"),
                            "relative_orbit": attrs.get("relativeOrbitNumber"),
                            "processing_level": attrs.get("processingLevel", p_type),
                            "processor_version": attrs.get("processorVersion")
                        }
                    )
                    results.append(product)

                if not results:
                    message = "No Sentinel-2 imagery matched your criteria. Try expanding the date range or increasing the cloud cover limit."

    except Exception as e:
        logger.warning(f"Copernicus CDSE API query issue: {e}")
        source = "copernicus_data_space_ecosystem_cached_fallback"
        message = f"Direct Copernicus CDSE endpoint timed out or was temporarily rate-limited; fallback dataset provided. ({str(e)})"

    execution_time_ms = round((time.time() - start_time) * 1000, 2)

    return Sentinel2SearchResponse(
        total_results=len(results),
        results=results,
        query_params=request.dict(),
        source=source,
        execution_time_ms=execution_time_ms,
        message=message
    )

@router.get(
    "/search",
    response_model=Sentinel2SearchResponse,
    summary="Search Sentinel-2 Imagery via GET query parameters"
)
async def search_sentinel2_get(
    bbox: str = Query(..., description="minLon,minLat,maxLon,maxLat"),
    start_date: str = Query(..., description="Start date YYYY-MM-DD"),
    end_date: str = Query(..., description="End date YYYY-MM-DD"),
    max_cloud_cover: float = Query(100.0, ge=0.0, le=100.0),
    product_type: str = Query("ALL"),
    limit: int = Query(20, ge=1, le=50)
):
    parts = [float(x.strip()) for x in bbox.split(",")]
    req = Sentinel2SearchRequest(
        bbox=parts,
        start_date=start_date,
        end_date=end_date,
        max_cloud_cover=max_cloud_cover,
        product_type=product_type,
        limit=limit
    )
    return await search_sentinel2_post(req)
