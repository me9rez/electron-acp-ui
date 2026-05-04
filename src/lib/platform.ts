// Platform detection helpers for the frontend.

export type Platform =
  | 'macos'
  | 'linux'
  | 'windows'
  | 'ios'
  | 'android'
  | 'unknown';

let cached: Platform | null = null;

export function getPlatform(): Platform {
  if (cached !== null) return cached;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIPad =
    /Macintosh/i.test(ua) &&
    typeof navigator !== 'undefined' &&
    (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints !==
      undefined &&
    ((navigator as Navigator & { maxTouchPoints: number }).maxTouchPoints ?? 0) > 1;
  if (/iPhone|iPad|iPod/i.test(ua) || isIPad) cached = 'ios';
  else if (/Android/i.test(ua)) cached = 'android';
  else if (/Mac/i.test(ua)) cached = 'macos';
  else if (/Windows/i.test(ua)) cached = 'windows';
  else if (/Linux/i.test(ua)) cached = 'linux';
  else cached = 'unknown';
  return cached;
}

export function isElectronHost(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as Window & { acpHost?: unknown }).acpHost !== 'undefined';
}

export function isTauriHost(): boolean {
  return false;
}

export function isWeb(): boolean {
  return !isElectronHost();
}

export function isMobile(): boolean {
  if (!isElectronHost()) return false;
  const p = getPlatform();
  return p === 'ios' || p === 'android';
}

export function isDesktop(): boolean {
  if (!isElectronHost()) return false;
  const p = getPlatform();
  return p === 'macos' || p === 'linux' || p === 'windows';
}

export function restrictedTransports(): boolean {
  return isWeb() || isMobile();
}

export function hasLocalFs(): boolean {
  return isDesktop();
}
