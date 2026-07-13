// Reads Telegram WebApp's live theme params and applies them as CSS custom
// properties, so the app actually follows the user's Telegram theme (light/
// dark/custom) instead of the static light-mode fallback in index.css.
//
// Call once on startup (see main.tsx) and it also subscribes to Telegram's
// "themeChanged" event so switching theme inside Telegram updates live.

const CSS_VAR_BY_PARAM: Record<string, string> = {
  bg_color: '--tg-theme-bg-color',
  secondary_bg_color: '--tg-theme-secondary-bg-color',
  section_bg_color: '--tg-theme-section-bg-color',
  text_color: '--tg-theme-text-color',
  hint_color: '--tg-theme-hint-color',
  link_color: '--tg-theme-link-color',
  button_color: '--tg-theme-button-color',
  button_text_color: '--tg-theme-button-text-color',
  accent_text_color: '--tg-theme-accent-text-color',
};

function applyThemeParams(themeParams: Record<string, string> | undefined) {
  if (!themeParams) return;
  const root = document.documentElement;
  for (const [param, cssVar] of Object.entries(CSS_VAR_BY_PARAM)) {
    const value = themeParams[param];
    if (value) root.style.setProperty(cssVar, value);
  }
}

export function applyTelegramTheme(): void {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return; // dev/browser preview: keep CSS fallback

  applyThemeParams(webApp.themeParams);
  webApp.onEvent?.('themeChanged', () => applyThemeParams(webApp.themeParams));
}
