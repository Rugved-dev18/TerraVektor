/**
 * Temporal parser - extracts and normalizes date ranges
 */
import { MONTH_NAMES, MONTH_SHORT_NAMES, AMBIGUOUS_TEMPORAL } from './vocabulary';
export function parseTemporal(query) {
    const lowerQuery = query.toLowerCase().trim();
    // Check for ambiguous temporal terms
    for (const ambiguous of AMBIGUOUS_TEMPORAL) {
        if (new RegExp(`\\b${ambiguous}\\b`, 'i').test(lowerQuery)) {
            return {
                startDate: null,
                endDate: null,
                confidence: 0.0,
                isAmbiguous: true,
                ambiguousReason: `Ambiguous temporal term "${ambiguous}" requires specific dates`
            };
        }
    }
    // Pattern 1: "between Month Year and Month Year"
    const betweenPattern = /between\s+(\w+)\s+(\d{4})\s+and\s+(\w+)\s+(\d{4})/i;
    const betweenMatch = lowerQuery.match(betweenPattern);
    if (betweenMatch) {
        const result = parseMonthYearPair(betweenMatch[1], betweenMatch[2], betweenMatch[3], betweenMatch[4]);
        if (result) {
            return {
                startDate: result.startDate,
                endDate: result.endDate,
                confidence: 1.0,
                isAmbiguous: false,
                ambiguousReason: null
            };
        }
    }
    // Pattern 2: "from Month Year to Month Year"
    const fromPattern = /from\s+(\w+)\s+(\d{4})\s+to\s+(\w+)\s+(\d{4})/i;
    const fromMatch = lowerQuery.match(fromPattern);
    if (fromMatch) {
        const result = parseMonthYearPair(fromMatch[1], fromMatch[2], fromMatch[3], fromMatch[4]);
        if (result) {
            return {
                startDate: result.startDate,
                endDate: result.endDate,
                confidence: 1.0,
                isAmbiguous: false,
                ambiguousReason: null
            };
        }
    }
    // Pattern 3: "Month Year to Month Year"
    const simplePattern = /(\w+)\s+(\d{4})\s+(?:to|until|through|-|–)\s+(\w+)\s+(\d{4})/i;
    const simpleMatch = lowerQuery.match(simplePattern);
    if (simpleMatch) {
        const result = parseMonthYearPair(simpleMatch[1], simpleMatch[2], simpleMatch[3], simpleMatch[4]);
        if (result) {
            return {
                startDate: result.startDate,
                endDate: result.endDate,
                confidence: 0.95,
                isAmbiguous: false,
                ambiguousReason: null
            };
        }
    }
    // Pattern 4: "Year to Year" (lower confidence - ambiguous months)
    const yearPattern = /(\d{4})\s+(?:to|until|through|-|–|vs|versus)\s+(\d{4})/i;
    const yearMatch = lowerQuery.match(yearPattern);
    if (yearMatch) {
        const startYear = parseInt(yearMatch[1]);
        const endYear = parseInt(yearMatch[2]);
        if (startYear < endYear) {
            // Year-only is too ambiguous for satellite analysis
            return {
                startDate: null,
                endDate: null,
                confidence: 0.0,
                isAmbiguous: true,
                ambiguousReason: 'Year-only ranges require specific months for satellite analysis'
            };
        }
    }
    // Pattern 5: "Month Year" (single date - incomplete)
    const singleDatePattern = /(\w+)\s+(\d{4})/i;
    const singleDateMatch = lowerQuery.match(singleDatePattern);
    if (singleDateMatch) {
        const monthIdx = getMonthIndex(singleDateMatch[1]);
        if (monthIdx !== -1) {
            const year = parseInt(singleDateMatch[2]);
            return {
                startDate: `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`,
                endDate: null,
                confidence: 0.5,
                isAmbiguous: false,
                ambiguousReason: 'Only start date detected - end date required'
            };
        }
    }
    return {
        startDate: null,
        endDate: null,
        confidence: 0.0,
        isAmbiguous: false,
        ambiguousReason: null
    };
}
function parseMonthYearPair(startMonthStr, startYearStr, endMonthStr, endYearStr) {
    const startMonthIdx = getMonthIndex(startMonthStr);
    const endMonthIdx = getMonthIndex(endMonthStr);
    if (startMonthIdx === -1 || endMonthIdx === -1) {
        return null;
    }
    const startYear = parseInt(startYearStr);
    const endYear = parseInt(endYearStr);
    if (startYear > endYear) {
        return null;
    }
    const startDate = `${startYear}-${String(startMonthIdx + 1).padStart(2, '0')}-01`;
    const endDate = `${endYear}-${String(endMonthIdx + 1).padStart(2, '0')}-28`;
    return { startDate, endDate };
}
function getMonthIndex(monthStr) {
    const lower = monthStr.toLowerCase();
    const idx = MONTH_NAMES.indexOf(lower);
    if (idx !== -1)
        return idx;
    return MONTH_SHORT_NAMES.indexOf(lower);
}
