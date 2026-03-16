/**
 * Xiaohongshu (小红书) Image Extraction Module
 * Ported from Cloudflare Pages implementation
 */

const FALLBACK_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface PostInfo {
  postId: string;
  xsecToken: string;
}

interface ExtractionResult {
  images: string[];
  title: string;
  isVideo: boolean;
}

/**
 * Check if content contains Xiaohongshu short link
 */
const isShortLink = (input: string): boolean => {
  return /https?:\/\/xhslink\.com\/[a-zA-Z0-9\/]+/.test(input);
};

/**
 * Extract short link from mixed content and resolve to full URL
 */
const parseShortLink = async (content: string): Promise<string | null> => {
  try {
    // Extract short link using regex
    const shortLinkRegex = /(https?:\/\/xhslink\.com\/[a-zA-Z0-9\/]+)/;
    const match = content.match(shortLinkRegex);

    if (!match) {
      return null;
    }

    const shortUrl = match[1];

    // Use fetch with redirect follow to get the final URL
    const response = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': FALLBACK_UA,
        Referer: 'https://www.xiaohongshu.com/',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    // Return the final URL after all redirects
    return response.url;
  } catch (error: any) {
    console.error('Failed to parse short link:', error.message);
    return null;
  }
};

/**
 * Extract postId and xsecToken from URL
 */
const extractPostInfo = (input: string): PostInfo | null => {
  // Extract URL part
  const urlRegex = /https?:\/\/(www\.)?xiaohongshu\.com\/[^\s?]*(\?[^\s]*)?/;
  const match = input.match(urlRegex);
  if (!match) return null;

  const urlObj = new URL(match[0]);
  const path = urlObj.pathname;

  // Extract Post ID (support explore, discovery/item, user/profile)
  const idMatch = path.match(/(?:explore|item|profile)\/([a-z0-9]+)/i);
  const postId = idMatch ? idMatch[1] : null;

  // Extract xsec_token
  const xsecToken = urlObj.searchParams.get('xsec_token');

  if (!postId || !xsecToken) return null;

  return { postId, xsecToken };
};

/**
 * Transform CDN/thumbnail URLs to original quality URLs
 */
const transformToOriginal = (urlStr: string): string => {
  try {
    const url = new URL(urlStr);
    const { hostname, pathname } = url;

    // Case 1: xhscdn.com domain conversion
    if (hostname.includes('xhscdn.com')) {
      const segments = pathname.split('/').filter(Boolean);
      // Match pattern: [subdomain, domain, date(12), hash(32), *subdirs, id!...]
      const subdirsAndId = segments.slice(2);
      const lastSegment = subdirsAndId.pop() || '';
      const imageId = lastSegment.split('!')[0];

      return `https://ci.xiaohongshu.com/${[...subdirsAndId, imageId].join('/')}`;
    }

    // Case 2: ci.xiaohongshu.com (remove query params)
    if (hostname === 'ci.xiaohongshu.com') {
      return `${url.origin}${pathname}`;
    }

    return urlStr;
  } catch {
    return urlStr;
  }
};

/**
 * Fetch post data and extract images
 */
const fetchPostData = async (postId: string, xsecToken: string): Promise<ExtractionResult> => {
  const targetUrl = `https://www.xiaohongshu.com/explore/${postId}?xsec_token=${xsecToken}`;

  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': FALLBACK_UA,
      Referer: 'https://www.xiaohongshu.com/',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      Cookie: 'webId=anonymous',
    },
  });

  if (!response.ok) {
    throw new Error(`XHS returned ${response.status}`);
  }

  const html = await response.text();

  // Extract window.__INITIAL_STATE__
  const stateRegex = /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})(?:<\/script>|;|$)/;
  const match = html.match(stateRegex);

  if (!match) {
    throw new Error('Initial state not found');
  }

  // Parse JSON (replace undefined with null)
  const state = JSON.parse(match[1].replace(/:undefined/g, ':null'));
  const noteData = state.note?.noteDetailMap?.[postId]?.note;

  if (!noteData) {
    throw new Error('Note data not found');
  }

  // Check if it's a video post
  const isVideo = noteData.type === 'video' || noteData.videoList?.length > 0;

  if (isVideo) {
    return {
      images: [],
      title: noteData.title || '',
      isVideo: true,
    };
  }

  if (!noteData.imageList || noteData.imageList.length === 0) {
    throw new Error('Image list not found');
  }

  const originalImages = noteData.imageList.map((img: any) =>
    transformToOriginal(img.urlDefault || img.url)
  );

  return {
    images: originalImages,
    title: noteData.title || '',
    isVideo: false,
  };
};

/**
 * Main extraction function
 * Accepts mixed content: share button text, short links, or full URLs
 */
export const extractImages = async (content: string): Promise<ExtractionResult> => {
  let contentToProcess = content;

  // If it's a short link (or contains one), resolve it first
  if (isShortLink(content)) {
    const fullLink = await parseShortLink(content);
    if (!fullLink) {
      throw new Error('Failed to resolve short link');
    }
    contentToProcess = fullLink;
  }

  // Extract post info from the URL
  const info = extractPostInfo(contentToProcess);

  if (!info) {
    throw new Error('Invalid Xiaohongshu URL. Could not extract postId or xsecToken.');
  }

  // Fetch and extract images
  return await fetchPostData(info.postId, info.xsecToken);
};

export type { ExtractionResult, PostInfo };
