const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character]);
}

export function buildAvatarDataUrl(name: string, background: string, size = 128): string {
  const normalizedName = (name || '').trim();
  const initials = normalizedName
    ? normalizedName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase()
    : '?';

  const rawColor = (background || '696cff').replace(/^#/, '');
  const color = /^[0-9a-f]{3,8}$/i.test(rawColor) ? rawColor : '696cff';
  const fontSize = Math.round(size * (initials.length > 1 ? 0.38 : 0.46));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#${color}"/><text x="50%" y="50%" dy="0.35em" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="600">${escapeXml(initials)}</text></svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
