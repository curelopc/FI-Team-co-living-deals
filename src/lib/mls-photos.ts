/** Research photo headers are read by name, independent of column position. */
export function parseMlsPhotos(cells: Record<string, string | undefined>): string[] {
  const gallery = cells['photo_gallery']?.trim() || cells['mls_photos'] || '';
  const candidates = [cells['photo_url'] || '', ...gallery.split(/[|\r\n]+/)];
  const photos = new Set<string>();
  for (const candidate of candidates) {
    const raw = candidate.trim();
    // Self-hosted copies under public/listing-photos. Arbitrary relative URLs stay out.
    if (raw.startsWith('/listing-photos/') && !raw.includes('..')) {
      photos.add(raw);
      if (photos.size === 30) break;
      continue;
    }
    try {
      const url = new URL(raw);
      if (url.protocol === 'https:' || url.protocol === 'http:') photos.add(url.href);
      if (photos.size === 30) break;
    } catch { /* Ignore empty or invalid sheet cells. */ }
  }
  return [...photos];
}
