import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPostInfo,
  extractProfileInfo,
  extractShortLink,
  normalizeNoteData,
  normalizeProfileData,
  parseXhsCount,
  transformToOriginal,
} from '../dist/xhs-extract.js';

test('extractShortLink reads xhslink from share text', () => {
  assert.equal(
    extractShortLink('看看这个 https://xhslink.com/AbC123 分享给你'),
    'https://xhslink.com/AbC123',
  );
});

test('extractPostInfo parses note id and xsec_token from full URLs', () => {
  const info = extractPostInfo('https://www.xiaohongshu.com/discovery/item/abc123?xsec_token=tok%3D&xsec_source=pc_search');
  assert.equal(info?.postId, 'abc123');
  assert.equal(info?.xsecToken, 'tok=');
  assert.equal(info?.canonicalUrl, 'https://www.xiaohongshu.com/explore/abc123?xsec_token=tok%3D');
});

test('extractProfileInfo parses user profile URLs', () => {
  const info = extractProfileInfo('https://www.xiaohongshu.com/user/profile/u123?xsec_token=tok&xsec_source=pc_search');
  assert.equal(info?.userId, 'u123');
  assert.equal(info?.canonicalUrl, 'https://www.xiaohongshu.com/user/profile/u123?xsec_token=tok&xsec_source=pc_search');
});

test('transformToOriginal converts Xiaohongshu CDN URLs', () => {
  assert.equal(
    transformToOriginal('https://sns-webpic-qc.xhscdn.com/20260703/signature/hash/spectrum/image-id!nc_n_nwebp_mw_1'),
    'https://ci.xiaohongshu.com/hash/spectrum/image-id',
  );
  assert.equal(
    transformToOriginal('https://ci.xiaohongshu.com/a/b/c?imageView2/2/w/1080'),
    'https://ci.xiaohongshu.com/a/b/c',
  );
});

test('parseXhsCount handles compact Chinese count strings', () => {
  assert.equal(parseXhsCount('1万+'), 10000);
  assert.equal(parseXhsCount('4.1万'), 41000);
  assert.equal(parseXhsCount('10K+'), 10000);
  assert.equal(parseXhsCount('2,345'), 2345);
});

test('normalizeNoteData returns structured note metadata', () => {
  const info = {
    postId: 'abc123',
    xsecToken: 'tok=',
    canonicalUrl: 'https://www.xiaohongshu.com/explore/abc123?xsec_token=tok%3D',
  };
  const note = normalizeNoteData({
    title: 'Test note',
    desc: 'Detailed description',
    type: 'normal',
    time: 1700000000000,
    lastUpdateTime: 1700003600000,
    user: {
      nickname: 'Alice',
      userId: 'user123',
      avatar: 'https://example.com/avatar.jpg',
    },
    tagList: [{ name: '旅行' }, { id: 'food' }],
    interactInfo: {
      likedCount: '1.2万',
      collectCount: '345',
      commentCount: '67',
    },
    imageList: [
      {
        urlDefault: 'https://sns-webpic-qc.xhscdn.com/20260703/signature/hash/spectrum/image-a!nc_n_nwebp_mw_1',
        width: 1080,
        height: 1440,
      },
    ],
  }, info);

  assert.equal(note.postId, 'abc123');
  assert.equal(note.title, 'Test note');
  assert.equal(note.description, 'Detailed description');
  assert.equal(note.isVideo, false);
  assert.equal(note.author.name, 'Alice');
  assert.equal(note.author.id, 'user123');
  assert.equal(note.author.profileUrl, 'https://www.xiaohongshu.com/user/profile/user123');
  assert.equal(note.publishTimestamp, 1700000000);
  assert.deepEqual(note.tags, ['旅行', 'food']);
  assert.deepEqual(note.counts, { like: 12000, collect: 345, comment: 67 });
  assert.equal(note.images.length, 1);
  assert.equal(note.images[0].originalUrl, 'https://ci.xiaohongshu.com/hash/spectrum/image-a');
  assert.equal(note.coverUrl, note.images[0].url);
});

test('normalizeNoteData returns video metadata for video notes', () => {
  const note = normalizeNoteData({
    title: 'Video note',
    type: 'video',
    video: {
      image: {
        firstFrameUrl: 'https://example.com/cover.jpg',
      },
      media: {
        stream: {
          h264: [
            {
              masterUrl: 'https://example.com/video.mp4',
              backupUrls: ['https://backup.example.com/video.mp4'],
              qualityType: 'HD',
              width: 1920,
              height: 1080,
              size: 123456,
            },
          ],
        },
      },
    },
  }, {
    postId: 'video123',
    xsecToken: 'tok=',
    canonicalUrl: 'https://www.xiaohongshu.com/explore/video123?xsec_token=tok%3D',
  });

  assert.equal(note.isVideo, true);
  assert.equal(note.images.length, 0);
  assert.equal(note.coverUrl, 'https://example.com/cover.jpg');
  assert.deepEqual(note.video, {
    url: 'https://example.com/video.mp4',
    backupUrls: ['https://backup.example.com/video.mp4'],
    codec: 'h264',
    quality: 'HD',
    width: 1920,
    height: 1080,
    size: 123456,
    coverUrl: 'https://example.com/cover.jpg',
  });
});

test('normalizeProfileData extracts profile fields and keeps blank-noteId cards distinct', () => {
  const profile = normalizeProfileData({
    user: {
      userPageData: {
        basicInfo: {
          nickname: '明日方舟终末地',
          redId: '95854265689',
          desc: '跨越边境 直至前线',
          ipLocation: '上海',
          gender: 2,
          imageb: 'https://sns-avatar-qc.xhscdn.com/avatar/big.jpg?imageView2/2/w/540/format/webp',
          images: 'https://sns-avatar-qc.xhscdn.com/avatar/small.jpg',
        },
        verifyInfo: { redOfficialVerifyType: 2 },
        extraInfo: { fstatus: 'none', blockType: 'DEFAULT' },
        interactions: [
          { type: 'follows', name: '关注', count: '1' },
          { type: 'fans', name: '粉丝', count: '1万+' },
          { type: 'interaction', name: '获赞与收藏', count: '4.1万' },
        ],
        tabPublic: {
          collectionNote: { count: 2, display: true, lock: false },
        },
      },
      noteQueries: [{ hasMore: true }],
      notes: [[
        {
          id: '',
          index: 0,
          xsecToken: 'token-a',
          noteCard: {
            noteId: '',
            xsecToken: 'token-a',
            type: 'video',
            displayTitle: '版本PV',
            user: { userId: 'u1', nickname: '明日方舟终末地' },
            interactInfo: { likedCount: '4.1万', sticky: true },
            cover: {
              width: 1348,
              height: 1011,
              urlDefault: 'http://sns-webpic-qc.xhscdn.com/20260703/signature/hash/spectrum/cover-a!nc_n_nwebp_mw_1',
            },
          },
        },
        {
          id: '',
          index: 1,
          xsecToken: 'token-b',
          noteCard: {
            noteId: '',
            xsecToken: 'token-b',
            type: 'normal',
            displayTitle: '参展情报公开',
            user: { userId: 'u1', nickname: '明日方舟终末地' },
            interactInfo: { likedCount: '2216', sticky: false },
            cover: {
              width: 6000,
              height: 3375,
              urlDefault: 'http://sns-webpic-qc.xhscdn.com/20260703/signature/hash/spectrum/cover-b!nc_n_nwebp_mw_1',
            },
          },
        },
      ]],
    },
  }, {
    userId: 'u1',
    canonicalUrl: 'https://www.xiaohongshu.com/user/profile/u1',
  });

  assert.equal(profile.nickname, '明日方舟终末地');
  assert.equal(profile.redId, '95854265689');
  assert.equal(profile.description, '跨越边境 直至前线');
  assert.equal(profile.ipLocation, '上海');
  assert.equal(profile.gender, 'female');
  assert.equal(profile.verifyType, 2);
  assert.equal(profile.followerCount, 10000);
  assert.equal(profile.likedAndCollectedCount, 41000);
  assert.equal(profile.hasMoreNotes, true);
  assert.equal(profile.postsLoaded, 2);
  assert.equal(profile.posts.length, 2);
  assert.equal(profile.posts[0].title, '版本PV');
  assert.equal(profile.posts[0].sticky, true);
  assert.equal(profile.posts[0].likeCount, 41000);
  assert.equal(profile.posts[1].title, '参展情报公开');
  assert.match(profile.posts[0].coverOriginalUrl, /^https:\/\/ci\.xiaohongshu\.com\//);
});
