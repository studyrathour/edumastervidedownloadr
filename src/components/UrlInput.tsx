import React, { useState, useEffect } from 'react';
import { Link2, Download, Zap } from 'lucide-react';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  defaultValue?: string;
  disabled?: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({ 
  onSubmit, 
  isLoading, 
  defaultValue = '',
  disabled = false 
}) => {
  const [url, setUrl] = useState(defaultValue);

  useEffect(() => {
    setUrl(defaultValue);
  }, [defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !disabled) {
      onSubmit(url.trim());
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Link2 className="h-5 w-5 text-cyan-400" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter M3U8 URL (e.g., https://example.com/video.m3u8)"
            className="block w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-100 placeholder-gray-400 text-sm backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || disabled}
            required
          />
          {disabled && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                Direct URL
              </span>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !url.trim() || disabled}
          className="w-full flex items-center justify-center px-6 py-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-cyan-500/25"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : disabled ? (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Auto-Processing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Download Video
            </>
          )}
        </button>
      </form>
    </div>
  );
};
