import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPostInfo,
  extractShortLink,
  normalizeNoteData,
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
