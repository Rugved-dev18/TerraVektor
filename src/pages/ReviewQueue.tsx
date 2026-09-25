import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  MessageSquare, 
  MapPin, 
  Calendar, 
  Loader2, 
  Filter
} from 'lucide-react';
import { getChangeCandidates, reviewCandidate } from '../services/api';
import { ChangeCandidate } from '../types';

export const ReviewQueue: React.FC = () => {
  const [candidates, setCandidates] = useState<ChangeCandidate[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<ChangeCandidate | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCandidates = async () => {
    setIsLoading(true);
    try {
      const data = await getChangeCandidates();
      setCandidates(data);
      if (data.length > 0 && !selectedCandidate) {
        setSelectedCandidate(data[0]);
      }
    } catch (err) {
      console.error('Failed to load review candidates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const handleDecision = async (decision: 'confirmed' | 'rejected' | 'needs_review') => {
    if (!selectedCandidate) return;
    setIsSubmitting(true);
    try {
      await reviewCandidate(selectedCandidate.id, decision, comment);
      setComment('');
      // Update local status
      setCandidates(prev => prev.map(c => {
        if (c.id === selectedCandidate.id) {
          return {
            ...c,
            status: decision === 'needs_review' ? 'pending' : decision
          };
        }
        return c;
      }));
      if (selectedCandidate) {
        setSelectedCandidate({
          ...selectedCandidate,
          status: decision === 'needs_review' ? 'pending' : decision
        });
      }
    } catch (err) {
      console.error('Failed to submit review decision:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-satellite-400 uppercase tracking-wider mb-1">
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>Quality Assurance & Ground Truth Validation</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Analyst Review Queue</h1>
        <p className="text-sm text-slate-400">
          Verify AI-detected surface changes, audit confidence scores, and confirm ground truth annotations.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-2 bg-ui-dark border border-ui-border rounded-xl p-2 w-fit">
        <Filter className="w-4 h-4 text-slate-400 ml-2" />
        {['all', 'pending', 'confirmed', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
              filterStatus === status 
                ? 'bg-satellite-500 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Candidates List */}
        <div className="lg:col-span-6 space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading review queue...</span>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="bg-ui-dark border border-ui-border rounded-xl p-8 text-center text-slate-400 text-sm">
              No change candidates in this filter view.
            </div>
          ) : (
            filteredCandidates.map(candidate => {
              const isSelected = selectedCandidate?.id === candidate.id;
              return (
                <div
                  key={candidate.id}
                  onClick={() => setSelectedCandidate(candidate)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/80 border-satellite-500 shadow-md'
                      : 'bg-ui-dark border-ui-border hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white capitalize">
                          {candidate.change_type.replace('_', ' ')}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded font-medium capitalize ${
                          candidate.status === 'confirmed' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : candidate.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {candidate.status}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-400 flex items-center gap-3 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span>Confidence: {(candidate.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-500">
                      ID #{candidate.id}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Verification Inspector & Action Box */}
        <div className="lg:col-span-6">
          {selectedCandidate ? (
            <div className="bg-ui-dark border border-ui-border rounded-xl p-5 sticky top-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-white">Review Candidate #{selectedCandidate.id}</h3>
                <span className="text-xs font-mono text-slate-400">
                  Detected: {new Date(selectedCandidate.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Classified Type</span>
                    <span className="text-xs font-semibold text-white capitalize mt-0.5 block">
                      {selectedCandidate.change_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Model Confidence</span>
                    <span className="text-xs font-semibold text-satellite-400 mt-0.5 block">
                      {(selectedCandidate.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">Target Coordinates</span>
                  <span className="text-xs font-mono text-slate-200">
                    Latitude: {selectedCandidate.latitude.toFixed(6)}, Longitude: {selectedCandidate.longitude.toFixed(6)}
                  </span>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">
                    Analyst Comment / Verification Log
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter observations, ground truth details, or verification rationale..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-satellite-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleDecision('confirmed')}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm Change</span>
                </button>

                <button
                  onClick={() => handleDecision('rejected')}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject / False Alarm</span>
                </button>

                <button
                  onClick={() => handleDecision('needs_review')}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium rounded-lg transition-all"
                >
                  Flag
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-ui-dark border border-ui-border rounded-xl p-12 text-center text-slate-500">
              Select a candidate from the queue to start review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewQueue;
