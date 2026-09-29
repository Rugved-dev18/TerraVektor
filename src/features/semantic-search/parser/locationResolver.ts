/**
 * Location resolver - extracts, resolves, and normalizes geographic locations.
 * Supports both deterministic offline preset matching and dynamic geographic
 * AOI resolution via OpenStreetMap Nominatim with India-first prioritization,
 * validation, ambiguity detection, and in-memory caching.
 */

import {
  LOCATION_ALIASES,
  AOI_PRESETS,
  LOCATION_PREFIXES
} from './vocabulary';

import {
  ResolvedLocation,
  LocationResolutionStatus,
  LocationResolutionResponse
} from '../../../types';

export type {
  ResolvedLocation,
  LocationResolutionStatus,
  LocationResolutionResponse
};

export interface LocationResult {
  location: string | null;
  aoi: [number, number, number, number] | null;
  confidence: number;
}

// ============================================================================
// 1. Synchronous Deterministic Resolver (Backward-Compatibility)
// ============================================================================

export function resolveLocation(query: string): LocationResult {
  const lowerQuery = query.toLowerCase().trim();

  // Remove location prefixes to isolate the location name
  let searchQuery = lowerQuery;
  for (const prefix of LOCATION_PREFIXES) {
    const prefixPattern = new RegExp(`\\b${prefix}\\s+`, 'i');
    searchQuery = searchQuery.replace(prefixPattern, '');
  }

  // Try to match location aliases
  for (const [alias, canonical] of Object.entries(LOCATION_ALIASES)) {
    // Check for exact word match (not substring)
    const pattern = new RegExp(`\\b${alias}\\b`, 'i');
    if (pattern.test(lowerQuery)) {
      const aoi = AOI_PRESETS[canonical];
      if (aoi) {
        return {
          location: canonical.charAt(0).toUpperCase() + canonical.slice(1),
          aoi,
          confidence: 1.0
        };
      }
    }
  }

  // Try to match location with variations (e.g., "Pune region", "Pune area")
  for (const [alias, canonical] of Object.entries(LOCATION_ALIASES)) {
    const patterns = [
      new RegExp(`\\b${alias}\\s+region\\b`, 'i'),
      new RegExp(`\\b${alias}\\s+area\\b`, 'i'),
      new RegExp(`\\b${alias}\\s+city\\b`, 'i'),
      new RegExp(`\\b${alias}\\s+zone\\b`, 'i')
    ];

    for (const pattern of patterns) {
      if (pattern.test(lowerQuery)) {
        const aoi = AOI_PRESETS[canonical];
        if (aoi) {
          return {
            location: canonical.charAt(0).toUpperCase() + canonical.slice(1),
            aoi,
            confidence: 0.9
          };
        }
      }
    }
  }

  return {
    location: null,
    aoi: null,
    confidence: 0.0
  };
}

export function getSupportedLocations(): string[] {
  return Object.keys(AOI_PRESETS).map(
    loc => loc.charAt(0).toUpperCase() + loc.slice(1)
  );
}

// ============================================================================
// 2. Dynamic Geographic Location Resolver (Nominatim Geocoding Provider)
// ============================================================================

export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function isValidBbox(bbox: [number, number, number, number]): boolean {
  const [west, south, east, north] = bbox;
  return (
    Number.isFinite(west) &&
    Number.isFinite(south) &&
    Number.isFinite(east) &&
    Number.isFinite(north) &&
    west >= -180 &&
    west <= 180 &&
    east >= -180 &&
    east <= 180 &&
    south >= -90 &&
    south <= 90 &&
    north >= -90 &&
    north <= 90 &&
    west < east &&
    south < north
  );
}

/**
 * Calculates Haversine distance between two points in kilometers
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determines whether two candidates represent distinct geographic places
 * (e.g. different country, different state, or separated by > 75km).
 */
export function areDistinctLocations(a: ResolvedLocation, b: ResolvedLocation): boolean {
  if (a.countryCode && b.countryCode && a.countryCode !== b.countryCode) {
    return true;
  }
  if (
    a.state &&
    b.state &&
    a.state.trim().toLowerCase() !== b.state.trim().toLowerCase()
  ) {
    return true;
  }
  const dist = getDistanceKm(a.center.lat, a.center.lon, b.center.lat, b.center.lon);
  return dist > 75;
}

// In-Memory Cache
interface CacheEntry {
  response: LocationResolutionResponse;
  timestamp: number;
}

const locationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 1000;

export function clearLocationCache(): void {
  locationCache.clear();
}

export function getLocationCacheSize(): number {
  return locationCache.size;
}

// Request Rate Limiting (Nominatim etiquette: >= 1s between requests)
let lastNominatimRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000;

async function throttleNominatim(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastNominatimRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastNominatimRequestTime = Date.now();
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state_district?: string;
  state?: string;
  country?: string;
  country_code?: string;
  postcode?: string;
  [key: string]: any;
}

interface NominatimRawResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  category: string;
  type: string;
  place_rank: number;
  importance?: number;
  addresstype?: string;
  name?: string;
  display_name: string;
  address?: NominatimAddress;
  boundingbox?: [string, string, string, string]; // [south, north, west, east]
}

/**
 * Strips leading location search prefixes like 'in ', 'near ', 'around the region of '
 */
export function cleanLocationQuery(query: string): string {
  let cleaned = query.trim();
  for (const prefix of LOCATION_PREFIXES) {
    const pattern = new RegExp(`^${prefix}\\s+`, 'i');
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.trim() || query.trim();
}

const NON_INDIA_COUNTRY_PATTERNS = [
  /\b(uk|united kingdom|england|scotland|wales|great britain|gb)\b/i,
  /\b(usa|united states|us|america)\b/i,
  /\b(france|germany|deutschland|italy|italia|spain|espana)\b/i,
  /\b(canada|australia|new zealand|nz)\b/i,
  /\b(japan|nippon|china|russia|brazil|mexico)\b/i,
  /\b(pakistan|bangladesh|nepal|sri lanka|bhutan|myanmar)\b/i,
  /\b(uae|dubai|saudi arabia|qatar|oman|kuwait)\b/i,
  /\b(singapore|malaysia|indonesia|thailand|vietnam|philippines)\b/i,
  /\b(switzerland|netherlands|sweden|norway|denmark|finland|ireland|portugal|greece)\b/i,
  /\b(south africa|egypt|kenya|nigeria)\b/i
];

function hasExplicitForeignContext(query: string): boolean {
  if (/\b(india|bharat|in)\b/i.test(query)) {
    return false;
  }
  return NON_INDIA_COUNTRY_PATTERNS.some(p => p.test(query));
}

async function fetchNominatim(query: string, limit = 8): Promise<NominatimRawResult[]> {
  await throttleNominatim();
  const encoded = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=jsonv2&addressdetails=1&limit=${limit}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'TerraVektor-Geocoding-Resolver/1.0 (contact: dhamdepritam@gmail.com; GIS Satellite Platform)'
    },
    signal: AbortSignal.timeout(7000)
  });

  if (!res.ok) {
    throw new Error(`Nominatim HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function parseNominatimItem(item: NominatimRawResult): ResolvedLocation | null {
  const lat = parseFloat(item.lat);
  const lon = parseFloat(item.lon);
  if (!isValidCoordinate(lat, lon)) {
    return null;
  }

  let west: number, south: number, east: number, north: number;
  if (item.boundingbox && item.boundingbox.length === 4) {
    south = parseFloat(item.boundingbox[0]);
    north = parseFloat(item.boundingbox[1]);
    west = parseFloat(item.boundingbox[2]);
    east = parseFloat(item.boundingbox[3]);
  } else {
    west = lon - 0.05;
    east = lon + 0.05;
    south = lat - 0.05;
    north = lat + 0.05;
  }

  // Handle point / degenerate bboxes
  if (west === east) {
    west -= 0.05;
    east += 0.05;
  }
  if (south === north) {
    south -= 0.05;
    north += 0.05;
  }
  if (west > east) {
    const tmp = west; west = east; east = tmp;
  }
  if (south > north) {
    const tmp = south; south = north; north = tmp;
  }

  const bbox: [number, number, number, number] = [
    Number(west.toFixed(6)),
    Number(south.toFixed(6)),
    Number(east.toFixed(6)),
    Number(north.toFixed(6))
  ];

  if (!isValidBbox(bbox)) {
    return null;
  }

  const addr = item.address || {};
  const name =
    item.name ||
    addr.city ||
    addr.town ||
    addr.village ||
    addr.state_district ||
    item.display_name.split(',')[0].trim();

  const country = addr.country;
  const countryCode = addr.country_code ? addr.country_code.toUpperCase() : undefined;
  const state = addr.state || addr.state_district;
  const importance = typeof item.importance === 'number' ? item.importance : 0.5;

  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (
    importance >= 0.50 &&
    (item.place_rank <= 16 || item.type === 'city' || item.type === 'administrative')
  ) {
    confidence = 'high';
  } else if (importance < 0.35) {
    confidence = 'low';
  }

  return {
    name,
    displayName: item.display_name,
    country,
    countryCode,
    state,
    bbox,
    center: {
      lat: Number(lat.toFixed(6)),
      lon: Number(lon.toFixed(6))
    },
    source: 'OpenStreetMap Nominatim',
    confidence,
    placeType: item.type || item.addresstype || item.category,
    importance
  };
}

/**
 * Resolves arbitrary geographic location names dynamically using real OpenStreetMap
 * Nominatim geocoding with India-first ranking, ambiguity detection, and caching.
 */
export async function resolveGeographicLocation(query: string): Promise<LocationResolutionResponse> {
  const startTime = Date.now();
  const trimmed = query?.trim() || '';

  if (!trimmed) {
    return {
      status: 'unresolved',
      query: trimmed,
      locationText: trimmed,
      message: 'Location query is empty.',
      execution_time_ms: 0
    };
  }

  // 1. Check in-memory cache
  const cacheKey = trimmed.toLowerCase();
  if (locationCache.has(cacheKey)) {
    const entry = locationCache.get(cacheKey)!;
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return {
        ...entry.response,
        cached: true,
        execution_time_ms: Date.now() - startTime
      };
    }
    locationCache.delete(cacheKey);
  }

  // 2. Clean prefixes for search if necessary
  const cleaned = cleanLocationQuery(trimmed);
  const isExplicitForeign = hasExplicitForeignContext(trimmed);

  // 3. Query OpenStreetMap Nominatim
  let rawResults: NominatimRawResult[] = [];
  try {
    rawResults = await fetchNominatim(cleaned);
    // If cleaned query yielded no results and differed from trimmed, try trimmed
    if (rawResults.length === 0 && cleaned !== trimmed) {
      rawResults = await fetchNominatim(trimmed);
    }
  } catch (err: any) {
    console.error(`[Location Resolver] Error resolving "${trimmed}":`, err.message);
    const failureResponse: LocationResolutionResponse = {
      status: 'unresolved',
      query: trimmed,
      locationText: trimmed,
      message: `Location lookup service error: ${err.message || 'Service unavailable'}.`,
      execution_time_ms: Date.now() - startTime
    };
    return failureResponse;
  }

  // 4. Parse & Validate candidates
  const parsedCandidates: ResolvedLocation[] = [];
  for (const raw of rawResults) {
    const loc = parseNominatimItem(raw);
    if (loc) {
      parsedCandidates.push(loc);
    }
  }

  if (parsedCandidates.length === 0) {
    const unresolvedResponse: LocationResolutionResponse = {
      status: 'unresolved',
      query: trimmed,
      locationText: trimmed,
      message: `Location "${trimmed}" could not be resolved.`,
      execution_time_ms: Date.now() - startTime
    };

    // Cache negative result briefly (10 mins) to prevent rapid spamming of unknown names
    locationCache.set(cacheKey, {
      response: unresolvedResponse,
      timestamp: Date.now()
    });

    return unresolvedResponse;
  }

  // 5. India-First Resolution logic
  let activeCandidates = parsedCandidates;

  // If the user did NOT explicitly specify a foreign country, prefer Indian candidates
  if (!isExplicitForeign) {
    const indianCandidates = parsedCandidates.filter(c => c.countryCode === 'IN');
    if (indianCandidates.length > 0) {
      activeCandidates = indianCandidates;
    }
  }

  // 6. Cluster candidates into distinct geographic places
  const distinctCandidates: ResolvedLocation[] = [];
  for (const cand of activeCandidates) {
    const exists = distinctCandidates.some(d => !areDistinctLocations(d, cand));
    if (!exists) {
      distinctCandidates.push(cand);
    }
  }

  let finalResponse: LocationResolutionResponse;

  if (distinctCandidates.length === 1) {
    // Single unambiguous location
    const chosen = distinctCandidates[0];
    finalResponse = {
      status: 'resolved',
      query: trimmed,
      location: chosen,
      execution_time_ms: Date.now() - startTime
    };
  } else if (distinctCandidates.length > 1) {
    // Multiple distinct locations exist
    const top = distinctCandidates[0];
    const second = distinctCandidates[1];
    const topImportance = top.importance || 0.5;
    const secondImportance = second.importance || 0.5;
    const importanceGap = topImportance - secondImportance;

    // If top candidate is overwhelmingly more important (e.g. major metropolis vs tiny hamlet, gap > 0.22)
    if (importanceGap > 0.22 && topImportance >= 0.58) {
      finalResponse = {
        status: 'resolved',
        query: trimmed,
        location: top,
        execution_time_ms: Date.now() - startTime
      };
    } else {
      // Ambiguous candidate locations
      finalResponse = {
        status: 'ambiguous',
        query: trimmed,
        candidates: distinctCandidates.slice(0, 5),
        execution_time_ms: Date.now() - startTime
      };
    }
  } else {
    finalResponse = {
      status: 'unresolved',
      query: trimmed,
      locationText: trimmed,
      message: `Location "${trimmed}" could not be resolved.`,
      execution_time_ms: Date.now() - startTime
    };
  }

  // 7. Store in cache
  if (locationCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = locationCache.keys().next().value;
    if (oldestKey) locationCache.delete(oldestKey);
  }
  locationCache.set(cacheKey, {
    response: finalResponse,
    timestamp: Date.now()
  });

  return finalResponse;
}
