import React, { useState } from 'react';
import { ImageIcon, Upload, Loader2, X } from 'lucide-react';
import { imageSearch } from '../services/api';
import { SearchResult } from '../types';
import { format } from 'date-fns';

const ImageSearch: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setResults([]);
    setHasSearched(false);
  };

  const handleSearch = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      // Convert image to base64 for API
      const base64 = preview || '';
      const response = await imageSearch(base64, 10);
      setResults(response.results);
    } catch (error) {
      console.error('Image search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="glass-effect rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Image Search</h2>
        <p className="text-slate-400 mb-6">
          Upload an image to find similar satellite imagery based on visual patterns and features.
        </p>

        <div className="space-y-4">
          {!selectedFile ? (
            <div className="border-2 border-dashed border-ui-border rounded-lg p-8 text-center hover:border-satellite-500 transition-colors">
              <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-300 mb-2">Upload an image to search</p>
              <p className="text-sm text-slate-400 mb-4">Supports JPG, PNG, and other common formats</p>
              <label className="inline-flex items-center px-4 py-2 bg-satellite-500 hover:bg-satellite-600 text-white rounded-lg cursor-pointer transition-colors">
                <Upload className="w-4 h-4 mr-2" />
                Select Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-slate-800 rounded-lg p-4">
                <button
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2 p-1 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
                <div className="flex items-center space-x-4">
                  {preview && (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-1">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-satellite-500 hover:bg-satellite-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Find Similar Images
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {hasSearched && (
        <div className="glass-effect rounded-xl overflow-hidden">
          <div className="p-4 border-b border-ui-border">
            <h3 className="text-lg font-semibold text-white">
              Similar Images ({results.length})
            </h3>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-satellite-500 animate-spin mx-auto mb-2" />
              <p className="text-slate-400">Analyzing image and searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center">
              <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No similar images found</p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result, index) => (
                <div key={result.scene_id} className="bg-slate-800/50 rounded-lg overflow-hidden hover:bg-slate-800 transition-colors">
                  <div className="aspect-video bg-slate-700 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-slate-500" />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-satellite-400">#{index + 1}</span>
                      <span className="text-sm font-bold text-satellite-400">
                        {(result.similarity_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-white mb-1 truncate">{result.scene_name}</h4>
                    <p className="text-xs text-slate-400">
                      {format(new Date(result.acquisition_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start">
          <ImageIcon className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-500 mb-1">Mock Image Search</h4>
            <p className="text-xs text-yellow-400/80">
              The image search is currently using a mock service. In the full implementation, 
              this would use actual computer vision embeddings to find visually similar satellite imagery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageSearch;
