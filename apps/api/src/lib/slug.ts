const MAX_SLUG_LENGTH = 60;

/** Derives a URL-safe slug from a display name. Always returns a non-empty string. */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    // Strip combining marks so "Café" becomes "cafe" rather than "caf".
    .replaceAll(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replaceAll(/^-+|-+$/g, '');

  // Names made entirely of punctuation or non-Latin script leave nothing behind.
  return slug || 'design-system';
}
