import React from 'react';
import { M3U8Playlist } from '../types';
import { Clock, Film, Hash, Sparkles } from 'lucide-react';

interface VideoInfoProps {
  playlist: M3U8Playlist;
}

export const VideoInfo: React.FC<VideoInfoProps> = ({ playlist }) => {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 backdrop-blur-sm">
      <div className="flex items-center mb-6">
        <Sparkles className="h-6 w-6 text-cyan-400 mr-3" />
        <h3 className="text-xl font-semibold text-gray-100">Video Information</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Duration</p>
            <p className="text-lg font-semibold text-gray-100">{formatDuration(playlist.totalDuration)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
              <Film className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Segments</p>
            <p className="text-lg font-semibold text-gray-100">{playlist.segments.length} parts</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Hash className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Version</p>
            <p className="text-lg font-semibold text-gray-100">HLS v{playlist.version}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
