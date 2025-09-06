import React from 'react';
import { DownloadProgress, M3U8Playlist } from '../types';
import { Download, X, Zap, Clock, Film } from 'lucide-react';

interface ProgressBarProps {
  progress: DownloadProgress;
  onCancel: () => void;
  playlist?: M3U8Playlist | null;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, onCancel, playlist }) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSegment = progress.segmentIndex <= playlist?.segments.length 
    ? playlist?.segments[progress.segmentIndex - 1] 
    : null;

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-100 flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center mr-3">
            <Zap className="h-4 w-4 text-white" />
          </div>
          EduMaster Processing
        </h3>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-full transition-colors"
          title="Cancel download"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Main Progress */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-gray-300">
            <span className="flex items-center">
              <Film className="h-4 w-4 mr-2 text-cyan-400" />
              Segment {progress.segmentIndex} of {progress.totalSegments}
            </span>
            <span className="font-semibold text-cyan-400">{progress.percentage}%</span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-600 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
              style={{ width: `${progress.percentage}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Video Information During Download */}
        {playlist && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-3 border border-blue-500/20">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-cyan-400 mr-2" />
                <div>
                  <div className="text-xs font-medium text-gray-300">Total Duration</div>
                  <div className="text-sm font-semibold text-gray-100">{formatDuration(playlist.totalDuration)}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-3 border border-green-500/20">
              <div className="flex items-center">
                <Film className="h-4 w-4 text-green-400 mr-2" />
                <div>
                  <div className="text-xs font-medium text-gray-300">Segments</div>
                  <div className="text-sm font-semibold text-gray-100">{playlist.segments.length} parts</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-3 border border-purple-500/20">
              <div className="flex items-center">
                <Download className="h-4 w-4 text-purple-400 mr-2" />
                <div>
                  <div className="text-xs font-medium text-gray-300">HLS Version</div>
                  <div className="text-sm font-semibold text-gray-100">v{playlist.version}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Segment Info */}
        {currentSegment && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/20">
            <h4 className="text-sm font-medium text-yellow-300 mb-2">Currently Processing</h4>
            <div className="space-y-1">
              <div className="text-xs text-gray-300">
                <span className="text-yellow-400">Segment {progress.segmentIndex}:</span> {currentSegment.title || `Part ${progress.segmentIndex}`}
              </div>
              <div className="text-xs text-gray-400">
                Duration: {formatDuration(currentSegment.duration)} • 
                URL: {currentSegment.uri.split('/').pop() || 'Processing...'}
              </div>
            </div>
          </div>
        )}
        
        {/* Data Transfer Info */}
        {progress.totalBytes > 0 && (
          <div className="flex justify-between text-xs text-gray-400 bg-gray-700/30 rounded-lg p-3">
            <span className="text-green-400 flex items-center">
              <Download className="h-3 w-3 mr-1" />
              {formatBytes(progress.downloadedBytes)} downloaded
            </span>
            <span>Total: {formatBytes(progress.totalBytes)}</span>
          </div>
        )}

        {/* Processing Status - Fixed DOM nesting */}
        <div className="text-center">
          <div className="text-sm text-gray-300">
            <span className="inline-flex items-center">
              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-cyan-400 mr-2 inline-block"></span>
              Processing video segments and converting to MP4...
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            This may take a few moments depending on video length and quality
          </div>
        </div>
      </div>
    </div>
  );
};
