// Shape of a YouTube channel as consumed by the scoring engine.
// (Ported from ChannelScore — only the type is needed here.)
export interface YouTubeChannelData {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  publishedAt: string;
  country: string;
  customUrl: string;
}
