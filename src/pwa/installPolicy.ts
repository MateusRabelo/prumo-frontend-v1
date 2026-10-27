export const INSTALL_INTERVAL = 7 * 24 * 60 * 60 * 1000;
export const INSTALL_SHOWN_KEY = 'prumo_pwa_install_shown_at';
export const INSTALLED_KEY = 'prumo_pwa_installed';

export function isAppleMobile(userAgent: string, platform: string, touchPoints: number) {
  return /iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1);
}

export function shouldOfferInstall(storage: Storage, now: number): boolean {
  try {
    if (storage.getItem(INSTALLED_KEY) === '1') return false;
    const previous = storage.getItem(INSTALL_SHOWN_KEY);
    if (!previous) return true;
    const timestamp = Number(previous);
    return !Number.isFinite(timestamp) || now - timestamp >= INSTALL_INTERVAL;
  } catch {
    // Without durable storage we cannot honor the seven-day limit. Don't nag.
    return false;
  }
}
