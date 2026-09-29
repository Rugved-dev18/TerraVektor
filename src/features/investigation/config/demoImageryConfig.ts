/**
 * TEMPORARY DEMO IMAGERY CONFIGURATION FOR SIH PRESENTATION VIDEO
 * ================================================================
 * Feature Flag: DEMO_BEFORE_AFTER
 * 
 * Instructions:
 * - Set DEMO_BEFORE_AFTER = true to display high-clarity before/after construction demo imagery in the swipe slider.
 * - Set DEMO_BEFORE_AFTER = false to revert 100% to real live Sentinel-2 imagery.
 * 
 * Safety & Isolation:
 * - This affects ONLY the client-side visual layer in the swipe slider.
 * - Real Sentinel-2 spectral analysis, candidate detection, NDVI/NDBI differencing, 
 *   water masking, and backend APIs remain completely untouched.
 */
export const DEMO_BEFORE_AFTER = true;

export const DEMO_IMAGERY_CONFIG = {
  // Visual layers: older pre-construction baseline (left) vs newer active construction (right)
  beforeUrl: '/demo/demo_before.jpg',
  afterUrl: '/demo/demo_after.jpg',
  // Strict non-analytical badge label
  badgeText: 'DEMO VISUALIZATION — NOT ANALYTICAL DATA'
};
