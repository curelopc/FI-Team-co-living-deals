import { describe, expect, it } from 'vitest';
import { elmiraGalleryProvenance, listingPhotoFallbacks } from '../lib/listing-photo-evidence';

describe('sanctioned Elmira public gallery', () => {
  it('retains exactly page photos0–29 in order with distinct decoded evidence', () => {
    const images = elmiraGalleryProvenance.images;
    expect(elmiraGalleryProvenance.embedded_count).toBe(43);
    expect(images.map(image => image.number)).toEqual(Array.from({ length: 30 }, (_, index) => index));
    expect(new Set(images.map(image => image.sha256)).size).toBe(30);
    for (const image of images) {
      const source = new URL(image.source_url);
      expect(source.searchParams.get('Key')).toBe('2057739304');
      expect(source.searchParams.get('Size')).toBe('4');
      expect(source.searchParams.get('Number')).toBe(String(image.number));
      expect(image.mime).toBe('image/jpeg');
      expect(image.width).toBe(1600);
      expect(image.height).toBe(1200);
      expect(image.byte_size).toBeGreaterThan(0);
    }
  });
  it('does not override future listings with Elmira assets', () => {
    expect(listingPhotoFallbacks('6')).toEqual([]);
    expect(listingPhotoFallbacks('8')).toEqual([]);
    expect(listingPhotoFallbacks('41')).toEqual([]);
    expect(listingPhotoFallbacks('40')).toHaveLength(30);
  });
});
