import React, { useState, useCallback, useEffect } from 'react';
import { UrlInput } from './components/UrlInput';
import { VideoInfo } from './components/VideoInfo';
import { ProgressBar } from './components/ProgressBar';
import { ErrorMessage } from './components/ErrorMessage';
import { M3U8Parser } from './utils/m3u8Parser';
import { VideoDownloader } from './utils/videoDownloader';
import { M3U8Playlist, DownloadProgress } from './types';
import { Video, Github, AlertTriangle, Sparkles, Zap, Clock } from 'lucide-react';

type AppState = 'idle' | 'parsing' | 'ready' | 'downloading' | 'completed';

function App() {
  const [state, setState] = useState<AppState>('idle');
  const [playlist, setPlaylist] = useState<M3U8Playlist | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadedBlob, setDownloadedBlob] = useState<Blob | null>(null);
  const [videoDownloader] = useState(() => new VideoDownloader());
  const [directUrl, setDirectUrl] = useState<string | null>(null);
  const [autoDownloadCountdown, setAutoDownloadCountdown] = useState<number | null>(null);

  // Enhanced URL validation for M3U8 files
  const isValidM3U8Url = useCallback((url: string): boolean => {
    if (!url || typeof url !== 'string' || url.length < 10) return false;
    
    try {
      const urlObj = new URL(url);
      
      // Check protocol
      const isValidProtocol = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
      if (!isValidProtocol) return false;
      
      // Check if URL contains m3u8
      const hasM3U8Extension = url.toLowerCase().includes('.m3u8');
      if (!hasM3U8Extension) return false;
      
      // Check domain validity
      const hasValidDomain = urlObj.hostname && urlObj.hostname.length >= 3 && urlObj.hostname.includes('.');
      if (!hasValidDomain) return false;
      
      // Additional checks for common invalid patterns
      const isNotLocalhost = !urlObj.hostname.includes('localhost') && !urlObj.hostname.includes('127.0.0.1');
      
      return isNotLocalhost;
    } catch (error) {
      console.warn('URL validation failed:', error);
      return false;
    }
  }, []);

  // Enhanced URL extraction with better error handling
  const extractUrlFromPath = useCallback(() => {
    try {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      
      let urlToProcess = null;
      
      // Method 1: Check URL path (after domain.com/)
      if (path.length > 1) {
        const pathUrl = path.substring(1);
        if (pathUrl.startsWith('http')) {
          try {
            // Try decoding the URL
            urlToProcess = decodeURIComponent(pathUrl);
          } catch (decodeError) {
            console.warn('Failed to decode path URL, trying without decoding:', decodeError);
            // Fallback to non-decoded URL
            urlToProcess = pathUrl;
          }
        }
      }
      
      // Method 2: Check URL search params (?url=...)
      if (!urlToProcess && search) {
        try {
          const urlParams = new URLSearchParams(search);
          const urlParam = urlParams.get('url') || urlParams.get('m3u8') || urlParams.get('video');
          if (urlParam) {
            urlToProcess = decodeURIComponent(urlParam);
          }
        } catch (error) {
          console.warn('Failed to parse search params:', error);
        }
      }
      
      // Method 3: Check URL hash (after #)
      if (!urlToProcess && hash.length > 1) {
        const hashUrl = hash.substring(1);
        if (hashUrl.startsWith('http')) {
          try {
            urlToProcess = decodeURIComponent(hashUrl);
          } catch (error) {
            console.warn('Failed to decode hash URL, trying without decoding:', error);
            urlToProcess = hashUrl;
          }
        }
      }
      
      // Validate the extracted URL
      if (urlToProcess) {
        console.log('Extracted URL:', urlToProcess);
        if (isValidM3U8Url(urlToProcess)) {
          return urlToProcess;
        } else {
          console.warn('Extracted URL failed validation:', urlToProcess);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting URL from path:', error);
      return null;
    }
  }, [isValidM3U8Url]);

  // Check for direct URL download on component mount
  useEffect(() => {
    const checkDirectUrl = () => {
      try {
        const urlToProcess = extractUrlFromPath();
        
        if (urlToProcess) {
          console.log('Valid direct M3U8 URL detected:', urlToProcess);
          setDirectUrl(urlToProcess);
          // Start processing immediately for direct URLs
          handleUrlSubmit(urlToProcess);
        } else {
          // Clear any previous direct URL state if no valid URL found
          setDirectUrl(null);
        }
      } catch (error) {
        console.error('Error in checkDirectUrl:', error);
        setDirectUrl(null);
      }
    };

    // Add a small delay to avoid immediate execution on mount
    const timer = setTimeout(checkDirectUrl, 200);
    return () => clearTimeout(timer);
  }, [extractUrlFromPath]);

  // Auto-download countdown for direct URLs
  useEffect(() => {
    if (directUrl && state === 'ready' && playlist) {
      setAutoDownloadCountdown(5);
      const countdown = setInterval(() => {
        setAutoDownloadCountdown(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            clearInterval(countdown);
            handleDownload();
            return null;
          }
        });
      }, 1000);

      return () => clearInterval(countdown);
    }
  }, [directUrl, state, playlist]);

  const handleUrlSubmit = useCallback(async (url: string) => {
    setState('parsing');
    setError(null);
    setPlaylist(null);
    setAutoDownloadCountdown(null);
    
    if (!isValidM3U8Url(url)) {
      setError('Please provide a valid M3U8 URL (must be HTTP/HTTPS and contain .m3u8)');
      setState('idle');
      return;
    }
    
    try {
      console.log('Processing M3U8 URL:', url);
      
      // Enhanced fetch with better headers and error handling
      const response = await fetch(url, { 
        mode: 'cors',
        method: 'GET',
        headers: {
          'Accept': 'application/x-mpegURL, application/vnd.apple.mpegurl, application/octet-stream, text/plain, */*',
          'User-Agent': 'EduMaster-VideoDownloader/1.0',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-cache',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const content = await response.text();
      
      if (!content || content.trim().length === 0) {
        throw new Error('Received empty response from M3U8 URL');
      }
      
      console.log('M3U8 content received, length:', content.length);
      
      const parsedPlaylist = M3U8Parser.parsePlaylist(content, url);
      console.log('Playlist parsed successfully:', {
        segments: parsedPlaylist.segments.length,
        duration: parsedPlaylist.totalDuration,
        version: parsedPlaylist.version
      });
      
      if (parsedPlaylist.segments.length === 0) {
        throw new Error('No video segments found in M3U8 playlist');
      }
      
      setPlaylist(parsedPlaylist);
      setState('ready');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('M3U8 processing error:', error);
      
      // Enhanced error handling with specific messages
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError(`Network Error: Unable to access the M3U8 file. This could be due to:
        • CORS restrictions on the server
        • Invalid or unreachable URL
        • Network connectivity issues
        Please ensure the URL is correct and the server allows cross-origin requests.`);
      } else if (errorMessage.includes('Invalid M3U8') || errorMessage.includes('No video segments')) {
        setError(`Invalid M3U8 Format: The provided URL does not contain a valid M3U8 playlist or has no video segments.`);
      } else if (errorMessage.includes('HTTP')) {
        setError(`Server Error: ${errorMessage}. The M3U8 file might be temporarily unavailable.`);
      } else {
        setError(`Processing Error: ${errorMessage}`);
      }
      setState('idle');
    }
  }, [isValidM3U8Url]);

  const handleDownload = useCallback(async () => {
    if (!playlist) return;
    
    setState('downloading');
    setAutoDownloadCountdown(null);
    setProgress({
      segmentIndex: 0,
      totalSegments: playlist.segments.length,
      downloadedBytes: 0,
      totalBytes: 0,
      percentage: 0
    });

    try {
      console.log('Starting download process...');
      const blob = await videoDownloader.downloadM3U8(
        playlist,
        setProgress,
        setError
      );
      
      console.log('Download completed, blob size:', blob.size);
      setDownloadedBlob(blob);
      setState('completed');
      
      // Auto-save for direct URLs
      if (directUrl) {
        setTimeout(() => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'edumaster-video.mp4';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log('Auto-download triggered for direct URL');
        }, 1000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      console.error('Download error:', errorMessage);
      
      // Enhanced download error handling
      if (errorMessage.includes('cancelled')) {
        setError('Download was cancelled by user');
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Network error during download. Please check your connection and try again.');
      } else {
        setError(`Download failed: ${errorMessage}`);
      }
      setState('ready');
    }
  }, [playlist, videoDownloader, directUrl]);

  const handleCancelDownload = useCallback(() => {
    videoDownloader.cancelDownload();
    setState('ready');
    setProgress(null);
    setAutoDownloadCountdown(null);
  }, [videoDownloader]);

  const handleSaveFile = useCallback(() => {
    if (!downloadedBlob) return;
    
    const url = URL.createObjectURL(downloadedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edumaster-video.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [downloadedBlob]);

  const handleReset = useCallback(() => {
    setState('idle');
    setPlaylist(null);
    setProgress(null);
    setError(null);
    setDownloadedBlob(null);
    setDirectUrl(null);
    setAutoDownloadCountdown(null);
    window.history.pushState({}, '', '/');
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Animated Background Stars */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="stars"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header - EduMaster Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            {/* EduMaster Logo */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 p-1 shadow-2xl shadow-blue-500/25">
                <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                  <img 
                    src="https://i.postimg.cc/fbZPqNrq/edumaster-logo.png" 
                    alt="EduMaster Logo"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                </div>
              </div>
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-cyan-400 animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent mb-4">
            EduMaster Video Downloader
          </h1>
          <div className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Advanced M3U8 to MP4 converter with direct URL support. Seamlessly download and convert video streams with our cutting-edge technology.
          </div>
          
          {/* Direct URL Feature Info */}
          <div className="mt-6 space-y-2">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-full">
              <Video className="h-4 w-4 text-cyan-400 mr-2" />
              <span className="text-sm text-gray-300">
                Pro Tip: Use direct URLs for instant downloads
              </span>
            </div>
            <div className="text-xs text-gray-400 max-w-xl mx-auto">
              <code className="text-cyan-400 bg-gray-800 px-2 py-1 rounded">domain.com/your-m3u8-url</code> or 
              <code className="text-cyan-400 bg-gray-800 px-2 py-1 rounded ml-1">domain.com?url=your-m3u8-url</code>
            </div>
          </div>
        </div>

        {/* EduMaster Processing - Moved here, right below branding */}
        {state === 'downloading' && progress && (
          <div className="max-w-4xl mx-auto mb-8">
            <ProgressBar
              progress={progress}
              onCancel={handleCancelDownload}
              playlist={playlist}
            />
          </div>
        )}

        {/* CORS Warning */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-300">CORS Security Notice</h3>
                <div className="mt-1 text-sm text-gray-300">
                  Due to browser security, some M3U8 URLs may require CORS headers. 
                  EduMaster works best with properly configured video servers.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Direct URL Display */}
          {directUrl && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center">
                <Sparkles className="h-5 w-5 text-green-400 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-green-300">Direct URL Processing</h3>
                  <div className="mt-1 text-sm text-gray-300 break-all">{directUrl}</div>
                  {state === 'parsing' && (
                    <div className="mt-1 text-xs text-yellow-400 flex items-center">
                      <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-400 mr-2 inline-block"></span>
                      <span>Parsing M3U8 playlist...</span>
                    </div>
                  )}
                  {state === 'ready' && autoDownloadCountdown && (
                    <div className="mt-1 text-xs text-green-400 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Auto-download starting in {autoDownloadCountdown} seconds...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* URL Input - Show even during direct URL processing */}
          {(state === 'idle' || state === 'parsing') && (
            <UrlInput
              onSubmit={handleUrlSubmit}
              isLoading={state === 'parsing'}
              defaultValue={directUrl || ''}
              disabled={!!directUrl}
            />
          )}

          {/* Error Message */}
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={() => setError(null)}
            />
          )}

          {/* Video Info - Show for all states when playlist is available */}
          {playlist && (state === 'ready' || state === 'downloading' || state === 'completed') && (
            <div className="space-y-6">
              <VideoInfo playlist={playlist} />
              
              {/* Auto-download countdown for direct URLs */}
              {directUrl && state === 'ready' && autoDownloadCountdown && (
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="h-5 w-5 text-cyan-400 mr-2" />
                    <span className="text-cyan-300 font-medium">EduMaster Auto-Download</span>
                  </div>
                  <div className="text-sm text-gray-300 mb-3">
                    Download will start automatically in <span className="text-cyan-400 font-bold text-lg">{autoDownloadCountdown}</span> seconds
                  </div>
                  <div className="text-xs text-gray-400">
                    Video Duration: {formatDuration(playlist.totalDuration)} • {playlist.segments.length} segments
                  </div>
                  <button
                    onClick={handleDownload}
                    className="mt-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900 transition-all duration-200"
                  >
                    Start Now
                  </button>
                </div>
              )}
              
              {/* Manual download button for non-direct URLs */}
              {!directUrl && state === 'ready' && (
                <div className="text-center">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center px-8 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900 transition-all duration-200 shadow-lg shadow-green-500/25"
                  >
                    <Video className="h-5 w-5 mr-2" />
                    Start Download
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Download Complete */}
          {state === 'completed' && downloadedBlob && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6 text-center backdrop-blur-sm">
              <div className="mb-4">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/25">
                  <Video className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-medium text-green-300 mb-2">Download Complete!</h3>
              <div className="text-sm text-gray-300 mb-2">
                Your video has been successfully converted to MP4 format by EduMaster.
              </div>
              {playlist && (
                <div className="text-xs text-gray-400 mb-6">
                  Duration: {formatDuration(playlist.totalDuration)} • Size: {(downloadedBlob.size / (1024 * 1024)).toFixed(2)} MB • {playlist.segments.length} segments processed
                </div>
              )}
              {directUrl && (
                <div className="text-xs text-green-400 mb-4">
                  Auto-download should start automatically. If not, click "Save Video" below.
                </div>
              )}
              <div className="space-x-4">
                <button
                  onClick={handleSaveFile}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900 transition-all duration-200"
                >
                  Save Video
                </button>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center px-6 py-3 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 transition-all duration-200"
                >
                  Download Another
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-700">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
              <span>Built with React & TypeScript by EduMaster</span>
              <a
                href="https://github.com"
                className="flex items-center hover:text-cyan-400 transition-colors"
              >
                <Github className="h-4 w-4 mr-1" />
                Source Code
              </a>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              © 2025 EduMaster Video Downloader. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
