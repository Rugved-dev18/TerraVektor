/**
 * Query Clarification Component
 * Displays parsing results and guides users to complete/fix queries
 */

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
  Activity,
  Building2,
  Leaf,
  ChevronRight
} from 'lucide-react';
import { QueryPlan } from '../types/queryPlan';
import { generateClarification } from '../parser/queryParser';

interface QueryClarificationProps {
  queryPlan: QueryPlan;
  onSelectExample?: (query: string) => void;
  onSelectIntent?: (intent: string) => void;
  onSelectLocation?: (location: any) => void;
}

export const QueryClarification: React.FC<QueryClarificationProps> = ({
  queryPlan,
  onSelectExample,
  onSelectIntent,
  onSelectLocation
}) => {
  const clarification = generateClarification(queryPlan);

  const getStatusIcon = () => {
    switch (queryPlan.status) {
      case 'valid':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'incomplete':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'ambiguous':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'unsupported':
        return <XCircle className="w-5 h-5 text-rose-600" />;
    }
  };

  const getStatusColor = () => {
    switch (queryPlan.status) {
      case 'valid':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'incomplete':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'ambiguous':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'unsupported':
        return 'bg-rose-50 border-rose-200 text-rose-900';
    }
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'built_up_change':
        return <Building2 className="w-4 h-4" />;
      case 'vegetation_change':
        return <Leaf className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-2xs p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start space-x-3">
        <div className="mt-0.5">{getStatusIcon()}</div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            {clarification.title}
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {clarification.description}
          </p>
        </div>
      </div>

      {/* Query Understanding Breakdown */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
          QUERY UNDERSTANDING
        </div>

        {/* Location */}
        <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded border border-slate-100">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-700">Location</span>
          </div>
          {queryPlan.locationStatus === 'unresolved' ? (
            <div className="flex items-center space-x-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-xs text-rose-600 font-medium">Location Not Found</span>
            </div>
          ) : queryPlan.locationStatus === 'ambiguous' ? (
            <div className="flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-blue-700 font-medium">Needs Clarification</span>
            </div>
          ) : queryPlan.location ? (
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">
                {queryPlan.resolvedLocation?.displayName || queryPlan.location}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-xs text-rose-600">Missing</span>
            </div>
          )}
        </div>

        {/* Investigation Type */}
        <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded border border-slate-100">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-700">Investigation</span>
          </div>
          {queryPlan.intent ? (
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">
                {queryPlan.intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-amber-600">Ambiguous</span>
            </div>
          )}
        </div>

        {/* Temporal Range */}
        <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded border border-slate-100">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-700">Temporal Range</span>
          </div>
          {queryPlan.startDate && queryPlan.endDate ? (
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">
                {queryPlan.startDate} → {queryPlan.endDate}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-xs text-rose-600">
                {queryPlan.startDate ? 'End date missing' : 'Missing'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Ambiguous Fields - Intent Selection */}
      {queryPlan.ambiguousFields.includes('investigation_type') && onSelectIntent && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            WHAT WOULD YOU LIKE TO INVESTIGATE?
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {clarification.ambiguousFields
              .find(f => f.field === 'Investigation Type')
              ?.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectIntent(option.value)}
                  className="flex items-center space-x-2 px-3 py-2.5 bg-white border border-slate-200 rounded hover:border-teal-300 hover:bg-teal-50 transition-colors text-left"
                >
                  {getIntentIcon(option.value)}
                  <span className="text-xs font-medium text-slate-700">{option.label}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Ambiguous Location Selection */}
      {(queryPlan.locationStatus === 'ambiguous' || (queryPlan.locationCandidates && queryPlan.locationCandidates.length > 0)) && queryPlan.locationCandidates && onSelectLocation && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            LOCATION NEEDS CLARIFICATION
          </div>
          <p className="text-xs text-slate-600">
            Multiple matching locations were found. Please select your target geographic area:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {queryPlan.locationCandidates.map((candidate, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectLocation(candidate)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded hover:border-teal-400 hover:bg-teal-50 transition-colors text-left text-xs font-medium text-slate-800 shadow-2xs"
              >
                [ {candidate.displayName} ]
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Missing Fields Suggestions */}
      {clarification.missingFields.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            REQUIRED INFORMATION
          </div>
          {clarification.missingFields.map((field, idx) => (
            <div key={idx} className="bg-amber-50 border border-amber-200 rounded p-3">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-900">{field.field}</span>
              </div>
              <p className="text-xs text-amber-800 mb-2">{field.description}</p>
              {field.suggestions.length > 0 && (
                <div className="text-[10px] text-amber-700 font-mono">
                  {field.suggestions.map((suggestion, sIdx) => (
                    <span key={sIdx} className="inline-block mr-2">
                      "{suggestion}"
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Example Queries */}
      {clarification.exampleQueries.length > 0 && onSelectExample && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            TRY THESE EXAMPLES
          </div>
          <div className="space-y-1.5">
            {clarification.exampleQueries.map((example, idx) => (
              <button
                key={idx}
                onClick={() => onSelectExample(example)}
                className="w-full flex items-center space-x-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded hover:border-teal-300 hover:bg-teal-50 transition-colors text-left group"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600 group-hover:text-teal-700" />
                <span className="text-xs text-slate-700 group-hover:text-teal-800">"{example}"</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unsupported Domain Message */}
      {queryPlan.status === 'unsupported' && (
        <div className="bg-rose-50 border border-rose-200 rounded p-3">
          <div className="flex items-center space-x-2 mb-2">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span className="text-xs font-bold text-rose-900">SUPPORTED INVESTIGATIONS</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-xs text-rose-800">
              <Building2 className="w-3.5 h-3.5" />
              <span>Built-up / construction change</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-rose-800">
              <Leaf className="w-3.5 h-3.5" />
              <span>Vegetation change</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-rose-800">
              <Activity className="w-3.5 h-3.5" />
              <span>General spectral change</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
