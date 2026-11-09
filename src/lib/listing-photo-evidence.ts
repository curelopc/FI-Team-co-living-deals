import elmiraFront from '@/assets/elmira-authorized-front-photo.png.asset.json';
import galleryEvidence from '@/assets/elmira-gallery-provenance.json';

export const elmiraFrontProvenance = 'https://drive.google.com/file/d/1aRrWbalNqIpMJmMw0K-Fyux3mh5OUEJW/view';
export const elmiraGalleryProvenance = galleryEvidence;
export const elmiraAuthorizedFrontFallback = elmiraFront.url;
/** Sanctioned exact-property fallback only; live gallery remains authoritative. */
export function listingPhotoFallbacks(researchId?: string): string[] {
  return researchId === '40' ? galleryEvidence.images.map(image => image.asset_url) : [];
}
