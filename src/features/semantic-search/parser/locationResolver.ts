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

/**
 * Extracts a location name or phrase from a natural language query
 * using aliases, prepositional patterns, or comparison verbs.
 */
export function extractLocationName(query: string): string | null {
  if (!query || typeof query !== 'string') return null;
  const lowerQuery = query.toLowerCase().trim();

  // 1. Check for known aliases first for fast matching
  for (const [alias, canonical] of Object.entries(LOCATION_ALIASES)) {
    const pattern = new RegExp(`\\b${alias}\\b`, 'i');
    if (pattern.test(lowerQuery)) {
      return canonical.charAt(0).toUpperCase() + canonical.slice(1);
    }
  }

  // 2. Prepositional extraction: around, near, in, at, surrounding, of, etc.
  const prepositionPattern = /(?:around|near|in|at|surrounding|of)\s+(?:the\s+(?:region|area|city|zone)\s+of\s+|the\s+)?([A-Za-z0-9\s,\.-]+?)(?=\s+(?:between|from|during|since|before|after|to|until|with|where|having|for|\d{4}|$)|[,\.\?!]|$)/i;
  const match = query.match(prepositionPattern);
  if (match && match[1]) {
    let loc = match[1].trim();
    loc = loc.replace(/\s+(?:between|from|to|until|during|with)$/i, '').trim();
    if (loc.length > 1) {
      return loc;
    }
  }

  // 3. Comparison / investigation verbs: "compare Pune from 2024 to 2026", "investigate Nashik between..."
  const verbPattern = /(?:compare|investigate|analyze|examine|search|for)\s+([A-Za-z0-9\s,\.-]+?)(?=\s+(?:between|from|during|since|before|after|to|until|with|\d{4}|$)|[,\.\?!]|$)/i;
  const verbMatch = query.match(verbPattern);
  if (verbMatch && verbMatch[1]) {
    let loc = verbMatch[1].trim();
    if (!/^(?:satellite|imagery|images|scenes|changes|spectral|vegetation|built-up|construction)$/i.test(loc)) {
      return loc;
    }
  }

  return null;
}

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

  // Dynamic candidate name extraction for synchronous parsing
  const extractedName = extractLocationName(query);
  if (extractedName) {
    return {
      location: extractedName,
      aoi: null,
      confidence: 0.7
    };
  }

  return {
    location: null,
    aoi: null,
    confidence: 0.0
  };
}

export function getSupportedLocations(): string[] {
  return [
    'Pune',
    'Mumbai',
    'Nashik',
    'Nagpur',
    'Kolhapur',
    'Bengaluru',
    'Delhi',
    'Chennai',
    'Jaipur'
  ];
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
  const aName = a.name.toLowerCase();
  const bName = b.name.toLowerCase();
  if (aName === bName || aName.startsWith(bName) || bName.startsWith(aName)) {
    if (a.placeType === 'city' || b.placeType === 'city' || a.placeType === 'administrative' || b.placeType === 'administrative') {
      return false;
    }
  }
  const dist = getDistanceKm(a.center.lat, a.center.lon, b.center.lat, b.center.lon);
  return dist > 75;
}

export const INDIAN_CITY_STATE_MAP: Record<string, string> = {
  nashik: 'Maharashtra',
  nasik: 'Maharashtra',
  pune: 'Maharashtra',
  poona: 'Maharashtra',
  nagpur: 'Maharashtra',
  kolhapur: 'Maharashtra',
  mumbai: 'Maharashtra',
  bombay: 'Maharashtra',
  thane: 'Maharashtra',
  aurangabad: 'Maharashtra',
  'chhatrapati sambhajinagar': 'Maharashtra',
  solapur: 'Maharashtra',
  amravati: 'Maharashtra',
  nanded: 'Maharashtra',
  sangli: 'Maharashtra',
  jalgaon: 'Maharashtra',
  akola: 'Maharashtra',
  latur: 'Maharashtra',
  dhule: 'Maharashtra',
  ahmednagar: 'Maharashtra',
  chandrapur: 'Maharashtra',
  parbhani: 'Maharashtra',
  bengaluru: 'Karnataka',
  bangalore: 'Karnataka',
  mysuru: 'Karnataka',
  mysore: 'Karnataka',
  hubli: 'Karnataka',
  mangalore: 'Karnataka',
  delhi: 'Delhi',
  'new delhi': 'Delhi',
  chennai: 'Tamil Nadu',
  madras: 'Tamil Nadu',
  coimbatore: 'Tamil Nadu',
  madurai: 'Tamil Nadu',
  jaipur: 'Rajasthan',
  jodhpur: 'Rajasthan',
  udaipur: 'Rajasthan',
  kota: 'Rajasthan',
  hyderabad: 'Telangana',
  warangal: 'Telangana',
  ahmedabad: 'Gujarat',
  surat: 'Gujarat',
  vadodara: 'Gujarat',
  rajkot: 'Gujarat',
  kolkata: 'West Bengal',
  calcutta: 'West Bengal',
  lucknow: 'Uttar Pradesh',
  kanpur: 'Uttar Pradesh',
  varanasi: 'Uttar Pradesh',
  agra: 'Uttar Pradesh',
  noida: 'Uttar Pradesh',
  ghaziabad: 'Uttar Pradesh',
  bhopal: 'Madhya Pradesh',
  indore: 'Madhya Pradesh',
  patna: 'Bihar',
  chandigarh: 'Punjab',
  amritsar: 'Punjab',
  kochi: 'Kerala',
  cochin: 'Kerala',
  thiruvananthapuram: 'Kerala',
  trivandrum: 'Kerala',
  guwahati: 'Assam',
  bhubaneswar: 'Odisha'
};

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

interface NominatimFetchOutcome {
  status: number;
  data: NominatimRawResult[];
  error?: string;
  errorType?: 'rate_limited' | 'rejected' | 'timeout' | 'network_error';
}

async function fetchNominatim(query: string, limit = 8): Promise<NominatimFetchOutcome> {
  await throttleNominatim();
  const encoded = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=jsonv2&addressdetails=1&limit=${limit}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'TerraVektor/1.0 (Geospatial Investigation Platform)'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (res.status === 429) {
      console.warn(`[LocationResolver] query=${query} status=429 resultCount=0`);
      return {
        status: 429,
        data: [],
        error: 'Geocoding service rate limited',
        errorType: 'rate_limited'
      };
    }

    if (res.status === 403) {
      console.warn(`[LocationResolver] query=${query} status=403 resultCount=0`);
      return {
        status: 403,
        data: [],
        error: 'Geocoding service rejected the request',
        errorType: 'rejected'
      };
    }

    if (!res.ok) {
      console.warn(`[LocationResolver] query=${query} status=${res.status} resultCount=0`);
      return {
        status: res.status,
        data: [],
        error: `Geocoding service returned HTTP ${res.status}`,
        errorType: 'network_error'
      };
    }

    const data = await res.json();
    const results = Array.isArray(data) ? data : [];
    console.log(`[LocationResolver] query=${query} status=200 resultCount=${results.length}`);
    return {
      status: 200,
      data: results
    };
  } catch (err: any) {
    const isTimeout =
      err?.name === 'TimeoutError' ||
      err?.name === 'AbortError' ||
      err?.message?.includes('timeout') ||
      err?.message?.includes('aborted');

    console.warn(`[LocationResolver] query=${query} status=timeout_or_network resultCount=0`);
    return {
      status: 0,
      data: [],
      error: 'Geocoding service temporarily unavailable',
      errorType: isTimeout ? 'timeout' : 'network_error'
    };
  }
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
      resolved: false,
      query: trimmed,
      locationText: trimmed,
      message: 'Location query is empty.',
      execution_time_ms: 0
    };
  }

  // 1. Client-Side Guard: Geocoding MUST remain strictly server-side
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/location/resolve?q=${encodeURIComponent(trimmed)}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data: LocationResolutionResponse = await res.json();
        return data;
      }
      const errJson = await res.json().catch(() => ({}));
      return {
        status: 'unresolved',
        resolved: false,
        query: trimmed,
        locationText: trimmed,
        message: errJson.message || `Geocoding service returned HTTP ${res.status}`,
        errorType: res.status === 429 ? 'rate_limited' : res.status === 403 ? 'rejected' : 'network_error',
        execution_time_ms: Date.now() - startTime
      };
    } catch {
      return {
        status: 'unresolved',
        resolved: false,
        query: trimmed,
        locationText: trimmed,
        message: 'Geocoding service temporarily unavailable',
        errorType: 'timeout',
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  // 2. Check 24-hour in-memory cache
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

  // 3. Clean prefixes for search
  const cleaned = cleanLocationQuery(trimmed);
  const isExplicitForeign = hasExplicitForeignContext(trimmed);

  // 4. Build prioritized search query variants (e.g., 'Nashik, Maharashtra, India', 'Nashik, India', 'Nashik')
  const queriesToTry: string[] = [];
  const lowerCleaned = cleaned.toLowerCase();

  if (!isExplicitForeign && !cleaned.includes(',')) {
    const state = INDIAN_CITY_STATE_MAP[lowerCleaned];
    if (state) {
      queriesToTry.push(`${cleaned}, ${state}, India`);
    }
    queriesToTry.push(`${cleaned}, India`);
    queriesToTry.push(cleaned);
  } else {
    queriesToTry.push(cleaned);
  }

  if (cleaned !== trimmed && !queriesToTry.includes(trimmed)) {
    queriesToTry.push(trimmed);
  }

  // 5. Query OpenStreetMap Nominatim with safe error discrimination
  let rawResults: NominatimRawResult[] = [];
  let upstreamError: string | null = null;
  let upstreamErrorType: 'rate_limited' | 'rejected' | 'timeout' | 'network_error' | undefined = undefined;

  for (const q of queriesToTry) {
    const outcome = await fetchNominatim(q);
    if (outcome.status === 200 && outcome.data.length > 0) {
      rawResults = outcome.data;
      upstreamError = null;
      upstreamErrorType = undefined;
      break;
    } else if (outcome.error && !upstreamError) {
      upstreamError = outcome.error;
      upstreamErrorType = outcome.errorType;
      // If service is rate-limited or rejected, do not spam additional queries
      if (outcome.status === 429 || outcome.status === 403) {
        break;
      }
    }
  }

  // 6. Parse & Validate candidates
  const parsedCandidates: ResolvedLocation[] = [];
  for (const raw of rawResults) {
    const loc = parseNominatimItem(raw);
    if (loc) {
      parsedCandidates.push(loc);
    }
  }

  if (parsedCandidates.length === 0) {
    // Discriminate between upstream service failures and genuine Location Not Found
    const message = upstreamError || `Location "${trimmed}" could not be resolved. Try adding a state or country.`;
    const unresolvedResponse: LocationResolutionResponse = {
      status: 'unresolved',
      resolved: false,
      query: trimmed,
      locationText: trimmed,
      message,
      errorType: upstreamErrorType,
      execution_time_ms: Date.now() - startTime
    };

    // Cache negative result if not a transient failure (do not cache rate limits, timeouts, or rejections)
    if (upstreamErrorType !== 'rate_limited' && upstreamErrorType !== 'timeout' && upstreamErrorType !== 'rejected') {
      locationCache.set(cacheKey, {
        response: unresolvedResponse,
        timestamp: Date.now()
      });
    }

    return unresolvedResponse;
  }

  // 7. India-First Resolution logic
  let activeCandidates = parsedCandidates;
  if (!isExplicitForeign) {
    const indianCandidates = parsedCandidates.filter(c => c.countryCode === 'IN');
    if (indianCandidates.length > 0) {
      activeCandidates = indianCandidates;
    }
  }

  // 8. Cluster candidates into distinct geographic places
  const distinctCandidates: ResolvedLocation[] = [];
  for (const cand of activeCandidates) {
    const exists = distinctCandidates.some(d => !areDistinctLocations(d, cand));
    if (!exists) {
      distinctCandidates.push(cand);
    }
  }

  let finalResponse: LocationResolutionResponse;

  // Check for an exact city match that resolves city vs surrounding administrative district ambiguity
  const exactCityMatch = distinctCandidates.find(c =>
    c.name.toLowerCase() === cleaned.toLowerCase() &&
    (c.placeType === 'city' || c.placeType === 'town' || c.confidence === 'high')
  );

  if (exactCityMatch && (distinctCandidates.length === 1 || !distinctCandidates.some(d => d !== exactCityMatch && (d.placeType === 'city' || d.placeType === 'town') && d.name.toLowerCase() === cleaned.toLowerCase()))) {
    finalResponse = {
      status: 'resolved',
      resolved: true,
      source: exactCityMatch.source || 'OpenStreetMap Nominatim',
      query: trimmed,
      location: exactCityMatch,
      bbox: exactCityMatch.bbox,
      center: exactCityMatch.center,
      execution_time_ms: Date.now() - startTime
    };
  } else if (distinctCandidates.length === 1) {
    // Single unambiguous location
    const chosen = distinctCandidates[0];
    finalResponse = {
      status: 'resolved',
      resolved: true,
      source: chosen.source || 'OpenStreetMap Nominatim',
      query: trimmed,
      location: chosen,
      bbox: chosen.bbox,
      center: chosen.center,
      execution_time_ms: Date.now() - startTime
    };
  } else if (distinctCandidates.length > 1) {
    const top = distinctCandidates[0];
    const second = distinctCandidates[1];
    const topImportance = top.importance || 0.5;
    const secondImportance = second.importance || 0.5;
    const importanceGap = topImportance - secondImportance;

    if (importanceGap > 0.18 && topImportance >= 0.50) {
      finalResponse = {
        status: 'resolved',
        resolved: true,
        source: top.source || 'OpenStreetMap Nominatim',
        query: trimmed,
        location: top,
        bbox: top.bbox,
        center: top.center,
        execution_time_ms: Date.now() - startTime
      };
    } else {
      finalResponse = {
        status: 'ambiguous',
        resolved: false,
        query: trimmed,
        candidates: distinctCandidates.slice(0, 5),
        execution_time_ms: Date.now() - startTime
      };
    }
  } else {
    finalResponse = {
      status: 'unresolved',
      resolved: false,
      query: trimmed,
      locationText: trimmed,
      message: `Location "${trimmed}" could not be resolved. Try adding a state or country.`,
      execution_time_ms: Date.now() - startTime
    };
  }

  // 9. Store in 24-hour cache
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
