import React, { useState, useEffect } from 'react';
import { ClipboardCheck, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getChangeCandidates, reviewCandidate } from '../services/api';
import { ChangeCandidate } from '../types';
import { format } from 'date-fns';

const ReviewQueue: React.FC = () => {
  const [candidates, setCandidates] = useState<ChangeCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setIsLoading(true);
    try {
      const data = await getChangeCandidates('pending');
      setCandidates(data);
    } catch (error) {
      console.error('Error loading candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (candidateId: number, decision: 'confirmed' | 'rejected') => {
    setReviewingId(candidateId);
    try {
      await reviewCandidate(candidateId, decision);
      // Reload candidates
      await loadCandidates();
    } catch (error) {
      console.error('Review error:', error);
    } finally {
      setReviewingId(null);
    }
  };

  const getChangeTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      construction: '🏗️',
      vegetation: '🌿',
      water: '💧',
      urban_expansion: '🏙️',
      deforestation: '🌲',
    };
    return icons[type] || '📍';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-satellite-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading review queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="glass-effect rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Review Queue</h2>
        <p className="text-slate-400 mb-6">
          Review and validate change candidates detected by the system. Confirm genuine changes or reject false alarms.
        </p>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-sm text-slate-300">Pending: {candidates.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-sm text-slate-300">Confirmed: {candidates.filter(c => c.status === 'confirmed').length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-sm text-slate-300">Rejected: {candidates.filter(c => c.status === 'rejected').length}</span>
          </div>
        </div>
      </div>

      {/* Review Cards */}
      <div className="space-y-4">
        {candidates.length === 0 ? (
          <div className="glass-effect rounded-xl p-8 text-center">
            <ClipboardCheck className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No pending change candidates to review</p>
            <p className="text-sm text-slate-500 mt-1">Check back after running change analysis</p>
          </div>
        ) : (
          candidates.map((candidate) => (
            <div key={candidate.id} className="glass-effect rounded-xl overflow-hidden">
              <div className="p-4 border-b border-ui-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getChangeTypeIcon(candidate.change_type)}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-white capitalize">
                        {candidate.change_type.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-slate-400">Candidate #{candidate.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getConfidenceColor(candidate.confidence)}`}>
                      {(candidate.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-slate-400">confidence</div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-400">Location</span>
                    </div>
                    <p className="text-sm text-white">
                      {candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <ClipboardCheck className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-400">Detected</span>
                    </div>
                    <p className="text-sm text-white">
                      {format(new Date(candidate.earliest_detection_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs text-slate-400">Scene Pair</span>
                    </div>
                    <p className="text-sm text-white">
                      #{candidate.before_scene_id} → #{candidate.after_scene_id}
                    </p>
                  </div>
                </div>

                {/* Before/After Placeholder */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-2">Before Scene #{candidate.before_scene_id}</p>
                    <div className="aspect-video bg-slate-700 rounded flex items-center justify-center">
                      <span className="text-slate-500 text-sm">Before Image</span>
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-2">After Scene #{candidate.after_scene_id}</p>
                    <div className="aspect-video bg-slate-700 rounded flex items-center justify-center">
                      <span className="text-slate-500 text-sm">After Image</span>
                    </div>
                  </div>
                </div>

                {/* Review Actions */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleReview(candidate.id, 'confirmed')}
                    disabled={reviewingId === candidate.id}
                    className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    {reviewingId === candidate.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Change
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleReview(candidate.id, 'rejected')}
                    disabled={reviewingId === candidate.id}
                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    {reviewingId === candidate.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject (False Alarm)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start">
          <ClipboardCheck className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-500 mb-1">Mock Review System</h4>
            <p className="text-xs text-yellow-400/80">
              The review system is functional for the MVP. In production, this would integrate with 
              actual satellite imagery comparison tools and analyst workflow management systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewQueue;
