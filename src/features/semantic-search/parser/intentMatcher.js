/**
 * Intent matcher - determines investigation type from natural language
 */
import { BUILT_UP_KEYWORDS, VEGETATION_KEYWORDS, DECREASE_KEYWORDS, INCREASE_KEYWORDS, UNSUPPORTED_DOMAINS } from './vocabulary';
export function matchIntent(query) {
    const lowerQuery = query.toLowerCase().trim();
    // Check for unsupported domains first
    const detectedUnsupported = [];
    for (const term of UNSUPPORTED_DOMAINS) {
        if (new RegExp(`\\b${term}\\b`, 'i').test(lowerQuery)) {
            detectedUnsupported.push(term);
        }
    }
    if (detectedUnsupported.length > 0) {
        return {
            intent: null,
            direction: null,
            confidence: 0.0,
            unsupportedTerms: detectedUnsupported
        };
    }
    // Count built-up keyword matches
    let builtUpMatches = 0;
    for (const keyword of BUILT_UP_KEYWORDS) {
        if (new RegExp(`\\b${keyword}\\b`, 'i').test(lowerQuery)) {
            builtUpMatches++;
        }
    }
    // Count vegetation keyword matches
    let vegetationMatches = 0;
    for (const keyword of VEGETATION_KEYWORDS) {
        if (new RegExp(`\\b${keyword}\\b`, 'i').test(lowerQuery)) {
            vegetationMatches++;
        }
    }
    // Determine direction
    let direction = null;
    let decreaseMatches = 0;
    let increaseMatches = 0;
    for (const keyword of DECREASE_KEYWORDS) {
        if (new RegExp(`\\b${keyword}\\b`, 'i').test(lowerQuery)) {
            decreaseMatches++;
        }
    }
    for (const keyword of INCREASE_KEYWORDS) {
        if (new RegExp(`\\b${keyword}\\b`, 'i').test(lowerQuery)) {
            increaseMatches++;
        }
    }
    if (decreaseMatches > increaseMatches) {
        direction = 'decrease';
    }
    else if (increaseMatches > decreaseMatches) {
        direction = 'increase';
    }
    else if (decreaseMatches > 0 || increaseMatches > 0) {
        direction = 'change';
    }
    // Determine intent based on keyword counts
    if (builtUpMatches > vegetationMatches && builtUpMatches > 0) {
        return {
            intent: 'built_up_change',
            direction,
            confidence: Math.min(1.0, builtUpMatches * 0.3 + 0.4),
            unsupportedTerms: []
        };
    }
    if (vegetationMatches > builtUpMatches && vegetationMatches > 0) {
        return {
            intent: 'vegetation_change',
            direction,
            confidence: Math.min(1.0, vegetationMatches * 0.3 + 0.4),
            unsupportedTerms: []
        };
    }
    // Check for general change keywords if no specific intent found
    const generalChangeKeywords = ['change', 'changed', 'changes', 'different', 'difference', 'compare', 'comparison'];
    let generalChangeMatches = 0;
    for (const keyword of generalChangeKeywords) {
        if (new RegExp(`\\b${keyword}\\b`, 'i').test(lowerQuery)) {
            generalChangeMatches++;
        }
    }
    if (generalChangeMatches > 0) {
        return {
            intent: 'general_change',
            direction: direction || 'change',
            confidence: Math.min(1.0, generalChangeMatches * 0.2 + 0.3),
            unsupportedTerms: []
        };
    }
    // No clear intent detected
    return {
        intent: null,
        direction,
        confidence: 0.0,
        unsupportedTerms: []
    };
}
