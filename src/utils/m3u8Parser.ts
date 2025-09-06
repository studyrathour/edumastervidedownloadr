import { M3U8Playlist, M3U8Segment } from '../types';

export class M3U8Parser {
  static parsePlaylist(content: string, baseUrl: string): M3U8Playlist {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    if (!lines[0].startsWith('#EXTM3U')) {
      throw new Error('Invalid M3U8 file format');
    }

    const segments: M3U8Segment[] = [];
    let currentDuration = 0;
    let targetDuration = 0;
    let version = 1;
    let mediaSequence = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('#EXT-X-VERSION:')) {
        version = parseInt(line.split(':')[1]);
      } else if (line.startsWith('#EXT-X-TARGETDURATION:')) {
        targetDuration = parseFloat(line.split(':')[1]);
      } else if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
        mediaSequence = parseInt(line.split(':')[1]);
      } else if (line.startsWith('#EXTINF:')) {
        const match = line.match(/#EXTINF:([\d.]+),?(.*)?/);
        if (match) {
          currentDuration = parseFloat(match[1]);
        }
      } else if (!line.startsWith('#') && line.length > 0) {
        // This is a segment URL
        const uri = this.resolveUrl(line, baseUrl);
        segments.push({
          duration: currentDuration,
          uri,
          title: `Segment ${segments.length + 1}`
        });
        currentDuration = 0;
      }
    }

    const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);

    return {
      segments,
      totalDuration,
      targetDuration,
      version,
      mediaSequence
    };
  }

  private static resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Remove filename from baseUrl to get directory
    const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
    return baseDir + url;
  }
}
