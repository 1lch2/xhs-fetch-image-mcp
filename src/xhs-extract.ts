/**
 * Xiaohongshu (小红书) extraction module.
 */

import { getRandomUserAgent } from './user-agent.js';

export interface PostInfo {
  postId: string;
  xsecToken: string;
  canonicalUrl: string;
}

export interface ProfileInfo {
  userId: string;
  canonicalUrl: string;
}

export interface ImageAsset {
  url: string;
  originalUrl: string;
  width?: number;
  height?: number;
}

export interface VideoAsset {
  url: string;
  backupUrls: string[];
  codec: string;
  quality: string;
  width?: number;
  height?: number;
  size?: number;
  coverUrl: string;
}

export interface NoteAuthor {
  name: string;
  id: string;
  avatar: string;
  profileUrl: string;
}

export interface NoteCounts {
  like: number;
  collect: number;
  comment: number;
}

export interface NoteExtractionResult {
  postId: string;
  url: string;
  title: string;
  description: string;
  isVideo: boolean;
  author: NoteAuthor;
  publishTime: string;
  publishTimestamp: number;
  updateTime: string;
  updateTimestamp: number;
  tags: string[];
  counts: NoteCounts;
  coverUrl: string;
  images: ImageAsset[];
  video: VideoAsset | null;
}

export interface ImageExtractionResult {
  images: string[];
  title: string;
  isVideo: boolean;
}

export interface ProfileInteraction {
  type: string;
  name: string;
  count: string;
  value: number;
}

export interface ProfileTab {
  key: string;
  name: string;
  count?: number;
  display?: boolean;
  lock?: boolean;
}

export interface ProfilePost {
  index: number;
  noteId: string;
  title: string;
  type: string;
  xsecToken: string;
  coverUrl: string;
  coverOriginalUrl: string;
  coverWidth?: number;
  coverHeight?: number;
  likeCount: number;
  likeCountText: string;
  sticky: boolean;
  url: string;
}

export interface ProfileExtractionResult {
  userId: string;
  url: string;
  nickname: string;
  redId: string;
  description: string;
  ipLocation: string;
  gender: string;
  genderCode: number | string;
  avatar: string;
  avatarSmall: string;
  verifyType: number | string;
  followStatus: string;
  blockType: string;
  followingCount: number;
  followingCountText: string;
  followerCount: number;
  followerCountText: string;
  likedAndCollectedCount: number;
  likedAndCollectedCountText: string;
  interactions: ProfileInteraction[];
  tabs: ProfileTab[];
  postsLoaded: number;
  hasMoreNotes: boolean;
  posts: ProfilePost[];
}

const XHS_SHORT_LINK_RE = /https?:\/\/xhslink\.com\/[a-zA-Z0-9/]+/;
const XHS_URL_RE = /https?:\/\/(www\.)?xiaohongshu\.com\/[^\s"'<>】）)]+/;

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function parseXhsCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;

  const s = value.trim().replace(/,/g, '').replace(/\s+/g, '');
  const match = s.match(/^([0-9]+(?:\.[0-9]+)?)(万|亿|k|K|w|W)?\+?$/);
  if (!match) return 0;

  const n = Number(match[1]);
  if (!Number.isFinite(n)) return 0;
  const unit = match[2];
  if (unit === '万' || unit === 'w' || unit === 'W') return Math.round(n * 10000);
  if (unit === '亿') return Math.round(n * 100000000);
  if (unit === 'k' || unit === 'K') return Math.round(n * 1000);
  return Math.round(n);
}

export function transformToOriginal(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    const { hostname, pathname } = url;

    if (hostname.includes('xhscdn.com')) {
      const segments = pathname.split('/').filter(Boolean);
      const subdirsAndId = segments.slice(2);
      const lastSegment = subdirsAndId.pop() || '';
      const imageId = lastSegment.split('!')[0];
      return `https://ci.xiaohongshu.com/${[...subdirsAndId, imageId].join('/')}`;
    }

    if (hostname === 'ci.xiaohongshu.com') {
      return `${url.origin}${pathname}`;
    }
  } catch {
    return urlStr;
  }
  return urlStr;
}

export function extractShortLink(content: string): string | null {
  return content.match(XHS_SHORT_LINK_RE)?.[0] ?? null;
}

async function resolveShortLink(content: string): Promise<string | null> {
  const shortLink = extractShortLink(content);
  if (!shortLink) return null;

  try {
    const response = await fetch(shortLink, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': getRandomUserAgent(),
        Referer: 'https://www.xiaohongshu.com/',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    return response.url;
  } catch (error: any) {
    console.error('Failed to parse short link:', error.message);
    return null;
  }
}

export function extractPostInfo(input: string): PostInfo | null {
  const match = input.match(XHS_URL_RE);
  if (!match) return null;

  const urlObj = new URL(match[0]);
  const idMatch = urlObj.pathname.match(/\/(?:explore|discovery\/item|item)\/([a-zA-Z0-9]+)/);
  const postId = idMatch ? idMatch[1] : '';
  const xsecToken = urlObj.searchParams.get('xsec_token') ?? '';

  if (!postId || !xsecToken) return null;

  return {
    postId,
    xsecToken,
    canonicalUrl: `${urlObj.origin}/explore/${postId}?xsec_token=${encodeURIComponent(xsecToken)}`,
  };
}

export function extractProfileInfo(input: string): ProfileInfo | null {
  const match = input.match(XHS_URL_RE);
  if (!match) return null;

  const urlObj = new URL(match[0]);
  const idMatch = urlObj.pathname.match(/\/user\/profile\/([a-zA-Z0-9]+)/);
  if (!idMatch) return null;

  return {
    userId: idMatch[1],
    canonicalUrl: `${urlObj.origin}${urlObj.pathname}${urlObj.search}`,
  };
}

async function normalizeContentUrl(content: string): Promise<string> {
  if (!XHS_SHORT_LINK_RE.test(content)) return content;
  const fullLink = await resolveShortLink(content);
  if (!fullLink) throw new Error('Failed to resolve short link');
  return fullLink;
}

function extractInitialState(html: string): any {
  const stateRegex = /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})(?:<\/script>|;|$)/;
  const match = html.match(stateRegex);
  if (!match) throw new Error('Initial state not found');
  return JSON.parse(match[1].replace(/:undefined/g, ':null'));
}

function findNoteData(state: any, postId: string): any {
  const noteDetailMap = state?.note?.noteDetailMap ?? {};
  const wrapper = noteDetailMap[postId];
  const direct = wrapper?.note ?? wrapper?.noteInfo ?? wrapper;
  if (direct && typeof direct === 'object') return direct;
  return null;
}

function formatTimestamp(value: unknown): { text: string; seconds: number } {
  if (typeof value !== 'number' || value <= 0) return { text: '', seconds: 0 };
  const ms = value > 100000000000 ? value : value * 1000;
  return { text: new Date(ms).toISOString(), seconds: Math.floor(ms / 1000) };
}

function cleanImageUrl(url: string): string {
  return url.startsWith('http://') ? `https://${url.slice('http://'.length)}` : url;
}

function genderLabel(value: unknown): string {
  if (value === 1 || value === '1') return 'male';
  if (value === 2 || value === '2') return 'female';
  return '';
}

function displayString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function normalizeInteractions(value: unknown): {
  rows: ProfileInteraction[];
  following?: ProfileInteraction;
  followers?: ProfileInteraction;
  likedAndCollected?: ProfileInteraction;
} {
  const rows: ProfileInteraction[] = [];
  if (!Array.isArray(value)) return { rows };

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    rows.push({
      type: firstString(row.type),
      name: firstString(row.name),
      count: displayString(row.count, row.i18nCount),
      value: parseXhsCount(row.count ?? row.i18nCount),
    });
  }

  return {
    rows,
    following: rows.find((row) => row.type === 'follows' || row.name === '关注'),
    followers: rows.find((row) => row.type === 'fans' || row.name === '粉丝'),
    likedAndCollected: rows.find((row) => row.type === 'interaction' || row.name.includes('获赞')),
  };
}

function coverUrlFromCard(cover: any): string {
  if (!cover || typeof cover !== 'object') return '';
  const infoList = Array.isArray(cover.infoList) ? cover.infoList : [];
  const defaultInfo = infoList.find((item: any) => item?.imageScene === 'WB_DFT') ?? infoList[0];
  return cleanImageUrl(firstString(cover.urlDefault, cover.url, cover.urlPre, defaultInfo?.url));
}

function normalizeProfileTabs(value: unknown): ProfileTab[] {
  if (!value || typeof value !== 'object') return [];
  const labels: Record<string, string> = {
    collection: 'collection',
    collectionNote: 'collection note',
    collectionBoard: 'collection board',
    collectionFile: 'collection file',
  };

  return Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      return {
        key,
        name: labels[key] ?? key,
        count: parseXhsCount(row.count),
        display: row.display === true,
        lock: row.lock === true,
      };
    }
    return { key, name: labels[key] ?? key };
  });
}

function normalizeProfilePost(raw: any, userId: string, fallbackIndex: number): ProfilePost | null {
  if (!raw || typeof raw !== 'object') return null;
  const card = raw.noteCard && typeof raw.noteCard === 'object' ? raw.noteCard : raw;
  const cardUser = card.user ?? raw.user ?? {};
  const cardUserId = firstString(card.userId, raw.userId, cardUser.userId, cardUser.id);
  if (cardUserId && cardUserId !== userId) return null;

  const noteId = firstString(card.noteId, raw.id, card.id, card.note_id, raw.note_id);
  const title = firstString(card.title, card.displayTitle, card.desc);
  const cover = card.cover ?? raw.cover ?? {};
  const coverUrl = coverUrlFromCard(cover);
  const interact = card.interactInfo ?? card.interact_info ?? raw.interactInfo ?? {};
  const xsecToken = firstString(card.xsecToken, raw.xsecToken);
  if (!noteId && !title && !coverUrl) return null;

  return {
    index: typeof raw.index === 'number' ? raw.index : fallbackIndex,
    noteId,
    title,
    type: firstString(card.type) || ((card.video || card.videoList) ? 'video' : 'normal'),
    xsecToken,
    coverUrl,
    coverOriginalUrl: coverUrl ? transformToOriginal(coverUrl) : '',
    coverWidth: typeof cover.width === 'number' ? cover.width : undefined,
    coverHeight: typeof cover.height === 'number' ? cover.height : undefined,
    likeCount: parseXhsCount(interact.likedCount ?? interact.likeCount),
    likeCountText: displayString(interact.likedCount, interact.likeCount),
    sticky: interact.sticky === true || card.sticky === true,
    url: noteId ? `https://www.xiaohongshu.com/explore/${noteId}${xsecToken ? `?xsec_token=${encodeURIComponent(xsecToken)}` : ''}` : '',
  };
}

function collectProfilePosts(state: any, userId: string): ProfilePost[] {
  const posts = new Map<string, ProfilePost>();
  const add = (post: ProfilePost | null) => {
    if (!post) return;
    const key = post.noteId || `${post.index}:${post.title}:${post.coverUrl}`;
    if (!posts.has(key)) posts.set(key, post);
  };

  const notesRoot = state?.user?.notes;
  if (Array.isArray(notesRoot)) {
    notesRoot.forEach((tab: unknown, tabIndex: number) => {
      if (!Array.isArray(tab)) return;
      tab.forEach((raw, index) => add(normalizeProfilePost(raw, userId, tabIndex * 1000 + index)));
    });
  }

  return Array.from(posts.values()).sort((a, b) => a.index - b.index);
}

function normalizeVideoData(noteData: any, coverUrl: string): VideoAsset | null {
  const stream = noteData?.video?.media?.stream;
  if (!stream || typeof stream !== 'object') return null;

  for (const codec of ['h265', 'h264', 'av1', 'h266']) {
    const candidates = stream[codec];
    if (!Array.isArray(candidates) || candidates.length === 0) continue;
    const item = candidates.find((candidate: any) => firstString(candidate.masterUrl, candidate.url)) ?? candidates[0];
    const url = firstString(item.masterUrl, item.url);
    if (!url) continue;
    return {
      url,
      backupUrls: Array.isArray(item.backupUrls) ? item.backupUrls.filter((v: unknown) => typeof v === 'string') : [],
      codec,
      quality: firstString(item.qualityType, item.quality, item.format),
      width: typeof item.width === 'number' ? item.width : undefined,
      height: typeof item.height === 'number' ? item.height : undefined,
      size: typeof item.size === 'number' ? item.size : undefined,
      coverUrl,
    };
  }

  return null;
}

export function normalizeNoteData(noteData: any, info: PostInfo): NoteExtractionResult {
  const isVideo = noteData.type === 'video' || (noteData.videoList?.length ?? 0) > 0;
  const title = firstString(noteData.title, noteData.displayTitle, noteData.desc);
  const author = noteData.user ?? {};
  const publish = formatTimestamp(noteData.time);
  const update = formatTimestamp(noteData.lastUpdateTime);
  const images: ImageAsset[] = Array.isArray(noteData.imageList)
    ? noteData.imageList.map((image: any) => {
      const url = firstString(image.urlDefault, image.url, image.urlPre);
      return {
        url,
        originalUrl: transformToOriginal(url),
        width: typeof image.width === 'number' ? image.width : undefined,
        height: typeof image.height === 'number' ? image.height : undefined,
      };
    }).filter((image: ImageAsset) => image.url)
    : [];
  const coverUrl = firstString(
    noteData.imageList?.[0]?.urlDefault,
    noteData.imageList?.[0]?.url,
    noteData.video?.image?.firstFrameUrl,
  );
  const interact = noteData.interactInfo ?? {};
  const authorId = firstString(author.userId, author.id);

  return {
    postId: info.postId,
    url: info.canonicalUrl,
    title,
    description: firstString(noteData.desc),
    isVideo,
    author: {
      name: firstString(author.nickname, author.nickName, author.name),
      id: authorId,
      avatar: firstString(author.avatar),
      profileUrl: authorId ? `https://www.xiaohongshu.com/user/profile/${authorId}` : '',
    },
    publishTime: publish.text,
    publishTimestamp: publish.seconds,
    updateTime: update.text,
    updateTimestamp: update.seconds,
    tags: Array.isArray(noteData.tagList)
      ? noteData.tagList.map((tag: any) => firstString(tag.name, tag.id)).filter(Boolean)
      : [],
    counts: {
      like: parseXhsCount(interact.likedCount ?? interact.likeCount),
      collect: parseXhsCount(interact.collectedCount ?? interact.collectCount),
      comment: parseXhsCount(interact.commentCount),
    },
    coverUrl,
    images,
    video: isVideo ? normalizeVideoData(noteData, coverUrl) : null,
  };
}

export function normalizeProfileData(state: any, info: ProfileInfo): ProfileExtractionResult {
  const pageData = state?.user?.userPageData ?? {};
  const basic = pageData.basicInfo ?? {};
  const extra = pageData.extraInfo ?? {};
  const verify = pageData.verifyInfo ?? {};
  const interactions = normalizeInteractions(pageData.interactions);
  const posts = collectProfilePosts(state, info.userId);
  const noteQueries = Array.isArray(state?.user?.noteQueries) ? state.user.noteQueries : [];

  return {
    userId: info.userId,
    url: info.canonicalUrl,
    nickname: firstString(basic.nickname, basic.nickName, basic.name, basic.userName) || info.userId,
    redId: firstString(basic.redId, basic.red_id, basic.redid),
    description: firstString(basic.desc, basic.description, basic.signature, basic.introduction),
    ipLocation: firstString(basic.ipLocation, basic.ip_location, basic.location),
    gender: genderLabel(basic.gender),
    genderCode: basic.gender ?? '',
    avatar: cleanImageUrl(firstString(basic.imageb, basic.images, basic.avatar, basic.image)),
    avatarSmall: cleanImageUrl(firstString(basic.images, basic.avatar, basic.image)),
    verifyType: verify.redOfficialVerifyType ?? '',
    followStatus: firstString(extra.fstatus),
    blockType: firstString(extra.blockType),
    followingCount: interactions.following?.value ?? 0,
    followingCountText: interactions.following?.count ?? '',
    followerCount: interactions.followers?.value ?? 0,
    followerCountText: interactions.followers?.count ?? '',
    likedAndCollectedCount: interactions.likedAndCollected?.value ?? 0,
    likedAndCollectedCountText: interactions.likedAndCollected?.count ?? '',
    interactions: interactions.rows,
    tabs: normalizeProfileTabs(pageData.tabPublic),
    postsLoaded: posts.length,
    hasMoreNotes: noteQueries.some((query: any) => query?.hasMore === true),
    posts,
  };
}

async function fetchNoteData(info: PostInfo): Promise<any> {
  const response = await fetch(info.canonicalUrl, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      Referer: 'https://www.xiaohongshu.com/',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      Cookie: 'webId=anonymous',
    },
  });

  if (!response.ok) throw new Error(`XHS returned ${response.status}`);

  const state = extractInitialState(await response.text());
  const noteData = findNoteData(state, info.postId);
  if (!noteData) throw new Error('Note data not found');
  return noteData;
}

export async function extractNote(content: string): Promise<NoteExtractionResult> {
  const contentToProcess = await normalizeContentUrl(content);
  const info = extractPostInfo(contentToProcess);
  if (!info) throw new Error('Invalid Xiaohongshu URL. Could not extract postId or xsecToken.');
  return normalizeNoteData(await fetchNoteData(info), info);
}

export async function extractProfile(content: string): Promise<ProfileExtractionResult> {
  const contentToProcess = await normalizeContentUrl(content);
  const info = extractProfileInfo(contentToProcess);
  if (!info) throw new Error('Invalid Xiaohongshu profile URL. Could not extract user id.');

  const response = await fetch(info.canonicalUrl, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      Referer: 'https://www.xiaohongshu.com/',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      Cookie: 'webId=anonymous',
    },
  });
  if (!response.ok) throw new Error(`XHS returned ${response.status}`);

  return normalizeProfileData(extractInitialState(await response.text()), info);
}

export async function extractImages(content: string): Promise<ImageExtractionResult> {
  const note = await extractNote(content);
  return {
    title: note.title,
    isVideo: note.isVideo,
    images: note.isVideo ? [] : note.images.map((image) => image.originalUrl),
  };
}
