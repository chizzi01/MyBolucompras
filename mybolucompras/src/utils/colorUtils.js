/**
 * Devuelve blanco u oscuro según la luminancia del color de fondo,
 * para garantizar contraste legible en chips de etiquetas.
 */
export function getContrastText(hexColor) {
  if (!hexColor || hexColor.length < 4) return '#1E293B';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1E293B' : '#F8FAFC';
}
