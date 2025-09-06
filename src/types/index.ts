export interface M3U8Segment {
  duration: number;
  uri: string;
  title?: string;
}

export interface M3U8Playlist {
  segments: M3U8Segment[];
  totalDuration: number;
  targetDuration: number;
  version: number;
  mediaSequence: number;
}

export interface DownloadProgress {
  segmentIndex: number;
  totalSegments: number;
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
}
