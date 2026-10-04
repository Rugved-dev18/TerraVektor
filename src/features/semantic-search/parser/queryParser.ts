/**
 * Main query parser - combines all parsers to produce structured query plan
 */

import { resolveLocation, resolveGeographicLocation, getSupportedLocations } from './locationResolver';
import { parseTemporal } from './temporalParser';
import { matchIntent } from './intentMatcher';
import { QueryPlan, QueryStatus, InvestigationIntent } from '../types/queryPlan';

export function parseQuery(query: string): QueryPlan {
  const originalQuery = query.trim();
  const normalizedQuery = originalQuery.toLowerCase().trim();

  // Parse each component
  const locationResult = resolveLocation(originalQuery);
  const temporalResult = parseTemporal(normalizedQuery);
  const intentResult = matchIntent(normalizedQuery);

  // Determine missing fields
  const missingFields: string[] = [];
  const ambiguousFields: string[] = [];

  if (!locationResult.location) {
    missingFields.push('location');
  }

  if (!temporalResult.startDate || !temporalResult.endDate) {
    missingFields.push('temporal_range');
  }

  if (temporalResult.isAmbiguous) {
    ambiguousFields.push('temporal_range');
  }

  if (!intentResult.intent && intentResult.unsupportedTerms.length === 0) {
    ambiguousFields.push('investigation_type');
  }

  // Determine overall status
  let status: QueryStatus;

  if (intentResult.unsupportedTerms.length > 0) {
    status = 'unsupported';
  } else if (missingFields.length > 0) {
    status = 'incomplete';
  } else if (ambiguousFields.length > 0) {
    status = 'ambiguous';
  } else {
    status = 'valid';
  }

  // Calculate overall confidence
  const confidence = (
    locationResult.confidence * 0.3 +
    temporalResult.confidence * 0.3 +
    intentResult.confidence * 0.4
  );

  const queryPlan: QueryPlan = {
    status,
    intent: intentResult.intent,
    location: locationResult.location,
    aoi: locationResult.aoi,
    startDate: temporalResult.startDate,
    endDate: temporalResult.endDate,
    start_date: temporalResult.startDate,
    end_date: temporalResult.endDate,
    direction: intentResult.direction,
    confidence,
    missingFields,
    ambiguousFields,
    unsupportedTerms: intentResult.unsupportedTerms,
    originalQuery,
    normalizedQuery
  };

  return queryPlan;
}

export async function parseQueryAsync(query: string): Promise<QueryPlan> {
  const plan = parseQuery(query);

  // If already unsupported, return immediately
  if (plan.status === 'unsupported') {
    return plan;
  }

  // If a location candidate or alias is identified, dynamically resolve it
  if (plan.location) {
    try {
      const geoResult = await resolveGeographicLocation(plan.location);
      if (geoResult.status === 'resolved' && geoResult.location) {
        plan.aoi = geoResult.location.bbox;
        plan.resolvedLocation = geoResult.location;
        plan.locationDetails = geoResult.location;
        plan.location = geoResult.location.name;
        plan.locationStatus = 'resolved';
        plan.missingFields = plan.missingFields.filter(f => f !== 'location');
      } else if (geoResult.status === 'ambiguous') {
        plan.aoi = null;
        plan.locationStatus = 'ambiguous';
        plan.locationCandidates = geoResult.candidates || [];
        if (!plan.ambiguousFields.includes('location_selection')) {
          plan.ambiguousFields.push('location_selection');
        }
      } else {
        // Unresolved
        plan.aoi = null;
        plan.locationStatus = 'unresolved';
        plan.locationError = geoResult.message;
        plan.errorType = geoResult.errorType;
        if (!plan.missingFields.includes('location')) {
          plan.missingFields.push('location');
        }
      }
    } catch (err) {
      console.error('[parseQueryAsync] Error resolving location:', err);
    }
  }

  // Re-evaluate overall status
  if (plan.unsupportedTerms.length > 0) {
    plan.status = 'unsupported';
  } else if (plan.missingFields.length > 0) {
    plan.status = 'incomplete';
  } else if (plan.ambiguousFields.length > 0) {
    plan.status = 'ambiguous';
  } else {
    plan.status = 'valid';
  }

  return plan;
}

export function generateClarification(queryPlan: QueryPlan): {
  title: string;
  description: string;
  missingFields: Array<{
    field: string;
    description: string;
    suggestions: string[];
  }>;
  ambiguousFields: Array<{
    field: string;
    options: Array<{
      label: string;
      value: any;
    }>;
  }>;
  exampleQueries: string[];
} {
  const exampleQueries: string[] = [];

  // Generate context-aware example queries
  if (queryPlan.location && !queryPlan.startDate) {
    // Has location, missing dates
    const location = queryPlan.location;
    const intent = queryPlan.intent || 'general_change';

    if (intent === 'built_up_change') {
      exampleQueries.push(
        `Find new construction around ${location} between May 2024 and May 2026`,
        `Show urban expansion in ${location} from January 2024 to January 2026`
      );
    } else if (intent === 'vegetation_change') {
      const direction = queryPlan.direction === 'decrease' ? 'loss' : 'increase';
      exampleQueries.push(
        `Show vegetation ${direction} around ${location} from May 2024 to May 2026`,
        `Find areas around ${location} with vegetation ${direction} between March 2024 and March 2026`
      );
    } else {
      exampleQueries.push(
        `Compare ${location} satellite imagery from May 2024 to May 2026`,
        `Find changes around ${location} between January 2024 and January 2026`
      );
    }
  } else if (queryPlan.startDate && queryPlan.endDate && !queryPlan.intent) {
    // Has dates, missing intent
    const location = queryPlan.location || 'Nashik';
    exampleQueries.push(
      `Find new construction around ${location} between ${formatDate(queryPlan.startDate)} and ${formatDate(queryPlan.endDate)}`,
      `Show vegetation change around ${location} from ${formatDate(queryPlan.startDate)} to ${formatDate(queryPlan.endDate)}`
    );
  } else {
    // General examples
    exampleQueries.push(
      'Find new construction around Nashik between May 2024 and May 2026',
      'Show vegetation loss near Nagpur from January 2024 to January 2026',
      'Show urban expansion around Kolhapur between March 2024 and March 2026'
    );
  }

  // Build missing fields
  const missingFields = queryPlan.missingFields.map(field => {
    if (field === 'location') {
      let desc = 'Specify a geographic area to investigate';
      if (queryPlan.locationStatus === 'unresolved') {
        if (queryPlan.errorType === 'rate_limited' || queryPlan.locationError?.includes('rate limited')) {
          desc = 'Geocoding service rate limited';
        } else if (queryPlan.errorType === 'rejected' || queryPlan.locationError?.includes('rejected')) {
          desc = 'Geocoding service rejected the request';
        } else if (queryPlan.errorType === 'timeout' || queryPlan.errorType === 'network_error' || queryPlan.locationError?.includes('temporarily unavailable')) {
          desc = 'Geocoding service temporarily unavailable';
        } else {
          desc = `Location "${queryPlan.location}" could not be resolved. Try adding a state or country.`;
        }
      }
      return {
        field: 'Location',
        description: desc,
        suggestions: getSupportedLocations().map(loc => `around ${loc}`)
      };
    }
    if (field === 'temporal_range') {
      return {
        field: 'Temporal Range',
        description: 'Specify start and end dates for comparison',
        suggestions: [
          'between May 2024 and May 2026',
          'from January 2024 to January 2026',
          'March 2024 through March 2026'
        ]
      };
    }
    return {
      field,
      description: 'This information is required',
      suggestions: []
    };
  });

  // Build ambiguous fields
  const ambiguousFields = queryPlan.ambiguousFields.map(field => {
    if (field === 'investigation_type') {
      return {
        field: 'Investigation Type',
        options: [
          { label: 'Built-up / construction change', value: 'built_up_change' },
          { label: 'Vegetation change', value: 'vegetation_change' },
          { label: 'General spectral change', value: 'general_change' }
        ]
      };
    }
    if (field === 'temporal_range') {
      return {
        field: 'Temporal Range',
        options: [
          { label: 'Specify exact dates', value: 'exact_dates' }
        ]
      };
    }
    if (field === 'location_selection' && queryPlan.locationCandidates) {
      return {
        field: 'Location Clarification',
        options: queryPlan.locationCandidates.map(c => ({
          label: c.displayName,
          value: c
        }))
      };
    }
    return {
      field,
      options: []
    };
  });

  // Determine title and description
  let title: string;
  let description: string;

  if (queryPlan.status === 'unsupported') {
    title = 'UNSUPPORTED INVESTIGATION';
    description = `This workspace currently supports built-up change, vegetation change, and temporal satellite comparison. The following terms are not supported: ${queryPlan.unsupportedTerms.join(', ')}.`;
  } else if (queryPlan.locationStatus === 'unresolved') {
    if (queryPlan.errorType === 'rate_limited' || queryPlan.locationError?.includes('rate limited')) {
      title = 'GEOCODING RATE LIMITED';
      description = 'Geocoding service rate limited. Please wait a moment before querying again.';
    } else if (queryPlan.errorType === 'rejected' || queryPlan.locationError?.includes('rejected')) {
      title = 'GEOCODING REJECTED';
      description = 'Geocoding service rejected the request.';
    } else if (queryPlan.errorType === 'timeout' || queryPlan.errorType === 'network_error' || queryPlan.locationError?.includes('temporarily unavailable')) {
      title = 'GEOCODING UNAVAILABLE';
      description = 'Geocoding service temporarily unavailable. Please try again shortly.';
    } else {
      title = 'LOCATION NOT FOUND';
      description = `Location "${queryPlan.location}" could not be resolved. Try adding a state or country.`;
    }
  } else if (queryPlan.locationStatus === 'ambiguous') {
    title = 'LOCATION NEEDS CLARIFICATION';
    description = 'Multiple distinct geographic locations matched this query. Please select your desired area of interest.';
  } else if (queryPlan.status === 'incomplete') {
    title = 'INCOMPLETE QUERY';
    description = 'Change analysis requires all parameters to be specified.';
  } else if (queryPlan.status === 'ambiguous') {
    title = 'AMBIGUOUS QUERY';
    description = 'Additional information is needed to proceed with the investigation.';
  } else {
    title = 'QUERY UNDERSTANDING';
    description = 'Query successfully parsed and ready for analysis.';
  }

  return {
    title,
    description,
    missingFields,
    ambiguousFields,
    exampleQueries
  };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'May 2024';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.toLocaleString('default', { month: 'long' });
  return `${month} ${year}`;
}

// Convert QueryPlan to the existing ParsedQuery format for backward compatibility
export function queryPlanToLegacy(queryPlan: QueryPlan): any {
  return {
    location: queryPlan.location || '',
    aoi: queryPlan.aoi,
    resolvedLocation: queryPlan.resolvedLocation || queryPlan.locationDetails,
    locationDetails: queryPlan.locationDetails || queryPlan.resolvedLocation,
    locationStatus: queryPlan.locationStatus,
    locationCandidates: queryPlan.locationCandidates,
    startDate: queryPlan.startDate,
    endDate: queryPlan.endDate,
    start_date: queryPlan.startDate,
    end_date: queryPlan.endDate,
    phenomenon: queryPlan.intent === 'vegetation_change' ? 'vegetation' : 
                queryPlan.intent === 'built_up_change' ? 'built_up' : 'general',
    direction: queryPlan.direction,
    changeType: queryPlan.intent === 'built_up_change' ? 'built_up' : null,
    status: queryPlan.status,
    missingFields: queryPlan.missingFields,
    error: queryPlan.status !== 'valid' ? generateClarification(queryPlan).description : undefined
  };
}
