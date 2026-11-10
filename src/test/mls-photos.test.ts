import { describe, expect, it } from 'vitest';
import { parseMlsPhotos } from '../lib/mls-photos';

describe('MLS photo headers', () => {
  it('puts the front photo first, splits pipes and newlines, trims and deduplicates', () => {
    expect(parseMlsPhotos({ photo_url: ' https://images.example/front.jpg ', photo_gallery: 'https://images.example/inside.jpg | https://images.example/front.jpg\nhttp://images.example/back.jpg\r\nhttps://images.example/inside.jpg' })).toEqual([
      'https://images.example/front.jpg', 'https://images.example/inside.jpg', 'http://images.example/back.jpg',
    ]);
  });
  it('prefers photo_gallery over the concurrent-editor fallback', () => {
    expect(parseMlsPhotos({ photo_gallery: 'https://images.example/primary.jpg', mls_photos: 'https://images.example/fallback.jpg' })).toEqual(['https://images.example/primary.jpg']);
  });
  it('caps the result at 30 total URLs including the front and first 29 valid unique gallery photos', () => {
    const front = 'https://images.example/front.jpg';
    const gallery = Array.from({ length: 70 }, (_, index) => `https://images.example/gallery-${index + 1}.jpg`);
    const photos = parseMlsPhotos({
      photo_url: front,
      photo_gallery: ['invalid', front, gallery[0], gallery[0], 'ftp://images.example/invalid.jpg', ...gallery.slice(1)].join('\n'),
    });
    expect(photos).toHaveLength(30);
    expect(photos).toEqual([front, ...gallery.slice(0, 29)]);
  });
  it('uses mls_photos when the primary header is missing or blank', () => {
    expect(parseMlsPhotos({ photo_gallery: ' ', mls_photos: 'https://images.example/fallback.jpg' })).toEqual(['https://images.example/fallback.jpg']);
  });
  it('filters non-http protocols, relative URLs and invalid cells without inventing photos', () => {
    expect(parseMlsPhotos({ photo_url: 'javascript:alert(1)', photo_gallery: '/relative.jpg | nope\ndata:image/png;base64,abc\nftp://images.example/a.jpg' })).toEqual([]);
    expect(parseMlsPhotos({})).toEqual([]);
    expect(parseMlsPhotos({ photo_url: '/listing-photos/6/01.webp', photo_gallery: '/relative.jpg\n/listing-photos/6/02.webp' })).toEqual(['/listing-photos/6/01.webp', '/listing-photos/6/02.webp']);
  });
});
