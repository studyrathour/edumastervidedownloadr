import { M3U8Playlist, DownloadProgress } from '../types';

export class VideoDownloader {
  private abortController: AbortController | null = null;

  async downloadM3U8(
    playlist: M3U8Playlist,
    onProgress: (progress: DownloadProgress) => void,
    onError: (error: string) => void
  ): Promise<Blob> {
    this.abortController = new AbortController();
    const segments: Uint8Array[] = [];
    let totalBytes = 0;
    let downloadedBytes = 0;

    try {
      // First pass: get total size estimate
      onProgress({
        segmentIndex: 0,
        totalSegments: playlist.segments.length,
        downloadedBytes: 0,
        totalBytes: 0,
        percentage: 0
      });

      for (let i = 0; i < playlist.segments.length; i++) {
        if (this.abortController.signal.aborted) {
          throw new Error('Download cancelled');
        }

        const segment = playlist.segments[i];
        
        try {
          const response = await fetch(segment.uri, {
            signal: this.abortController.signal,
            mode: 'cors'
          });

          if (!response.ok) {
            throw new Error(`Failed to download segment ${i + 1}: ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          segments.push(uint8Array);
          
          downloadedBytes += uint8Array.length;
          totalBytes += uint8Array.length;

          onProgress({
            segmentIndex: i + 1,
            totalSegments: playlist.segments.length,
            downloadedBytes,
            totalBytes,
            percentage: Math.round(((i + 1) / playlist.segments.length) * 100)
          });

        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error;
          }
          onError(`Error downloading segment ${i + 1}: ${error}`);
          throw error;
        }
      }

      // Combine all segments
      const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;

      for (const segment of segments) {
        combined.set(segment, offset);
        offset += segment.length;
      }

      return new Blob([combined], { type: 'video/mp4' });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Download cancelled');
      }
      throw error;
    }
  }

  cancelDownload(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}
