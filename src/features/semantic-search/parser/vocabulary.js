/**
 * Controlled vocabulary for deterministic natural language parsing
 * Maps natural language variations to structured investigation intents
 */
export const BUILT_UP_KEYWORDS = [
    'new construction',
    'construction',
    'urban expansion',
    'urban growth',
    'built-up growth',
    'development',
    'new buildings',
    'construction activity',
    'land development',
    'building',
    'buildings',
    'developed',
    'developing',
    'built-up',
    'built up',
    'infrastructure',
    'housing',
    'commercial',
    'industrial',
    'paved',
    'concrete'
];
export const VEGETATION_KEYWORDS = [
    'vegetation',
    'green',
    'greenery',
    'forest',
    'forests',
    'trees',
    'tree cover',
    'foliage',
    'canopy',
    'plant',
    'plants',
    'crops',
    'agriculture',
    'farmland',
    'ndvi',
    'green cover',
    'vegetation cover'
];
export const DECREASE_KEYWORDS = [
    'decrease',
    'decreased',
    'decreasing',
    'reduced',
    'reduction',
    'loss',
    'lost',
    'decline',
    'declining',
    'disappeared',
    'disappearing',
    'removed',
    'removal',
    'cleared',
    'clearing',
    'destroyed',
    'destruction',
    'less',
    'lower',
    'dropped',
    'drop',
    'shrink',
    'shrinking',
    'shrank'
];
export const INCREASE_KEYWORDS = [
    'increase',
    'increased',
    'increasing',
    'growth',
    'growing',
    'grew',
    'gain',
    'gained',
    'gaining',
    'more',
    'higher',
    'rise',
    'rising',
    'rose',
    'recovery',
    'recovering',
    'recovered',
    'regrowth',
    'regrowing',
    'regrew',
    'expansion',
    'expanded',
    'expand',
    'spread',
    'spreading',
    'spreaded'
];
export const TEMPORAL_CONNECTORS = [
    'between',
    'from',
    'to',
    'until',
    'through',
    'during',
    'in',
    'within',
    'vs',
    'versus',
    'compare',
    'compared',
    'comparison',
    'with',
    'and'
];
export const LOCATION_PREFIXES = [
    'around',
    'near',
    'in',
    'at',
    'around the',
    'near the',
    'in the',
    'at the',
    'around',
    'near',
    'region of',
    'area of',
    'city of',
    'around the region of',
    'near the region of',
    'in the region of'
];
export const UNSUPPORTED_DOMAINS = [
    'restaurant',
    'restaurants',
    'food',
    'hotel',
    'hotels',
    'shopping',
    'mall',
    'malls',
    'market',
    'markets',
    'tourist',
    'tourism',
    'attraction',
    'attractions',
    'entertainment',
    'movie',
    'movies',
    'cinema',
    'theater',
    'transport',
    'traffic',
    'weather',
    'climate',
    'politics',
    'news',
    'sports',
    'game',
    'games'
];
export const AMBIGUOUS_TEMPORAL = [
    'recently',
    'lately',
    'currently',
    'now',
    'today',
    'yesterday',
    'soon',
    'later',
    'earlier',
    'before',
    'after',
    'past',
    'future'
];
// Location aliases mapping to canonical names
export const LOCATION_ALIASES = {
    'pune': 'pune',
    'poona': 'pune',
    'mumbai': 'mumbai',
    'bombay': 'mumbai',
    'bengaluru': 'bengaluru',
    'bangalore': 'bengaluru',
    'delhi': 'delhi',
    'new delhi': 'delhi',
    'chennai': 'chennai',
    'madras': 'chennai',
    'jaipur': 'jaipur'
};
// AOI presets for Indian cities (from server.ts)
export const AOI_PRESETS = {
    'pune': [73.70, 18.40, 74.05, 18.70],
    'mumbai': [72.75, 18.90, 73.10, 19.25],
    'bengaluru': [77.45, 12.85, 77.75, 13.10],
    'delhi': [76.90, 28.45, 77.35, 28.85],
    'chennai': [80.10, 12.90, 80.35, 13.20],
    'jaipur': [75.65, 26.80, 75.95, 27.05]
};
// Month names for parsing
export const MONTH_NAMES = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
];
export const MONTH_SHORT_NAMES = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];
