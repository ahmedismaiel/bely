import i18next from 'i18next';
import arabic from './locales/ar';

export type Language = 'en' | 'ar';
let initial: Language = 'en';
try { if (localStorage.getItem('bely-language') === 'ar') initial = 'ar'; } catch { initial = 'en'; }
const requested = new URLSearchParams(location.search).get('lang');
if (requested === 'ar' || requested === 'en') initial = requested;

void i18next.init({
  lng: initial, fallbackLng: 'en', initAsync: false, keySeparator: false, nsSeparator: false,
  interpolation: { escapeValue: false },
  resources: { en: { translation: {} }, ar: { translation: arabic } },
});

export const language = () => i18next.language === 'ar' ? 'ar' : 'en';
export const isArabic = () => language() === 'ar';
export const t = (key: string, values: Record<string, string | number> = {}) => String(i18next.t(key, values));
export const bilingual = (english: string, arabicText: string) => isArabic() ? arabicText : english;

export function translateStatic(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n!); });
  for (const attribute of ['aria-label', 'title', 'data-tooltip']) {
    root.querySelectorAll<HTMLElement>(`[${attribute}]`).forEach((element) => {
      const sourceAttribute = `data-source-${attribute}`;
      const source = element.getAttribute(sourceAttribute) ?? element.getAttribute(attribute)!;
      element.setAttribute(sourceAttribute, source);
      element.setAttribute(attribute, t(source));
    });
  }
}

function applyLanguage() {
  document.documentElement.lang = language();
  document.documentElement.dir = isArabic() ? 'rtl' : 'ltr';
  document.title = isArabic() ? 'بلي / ملوك الحارة' : 'BELY / Kings of the Hara';
  translateStatic();
}

export async function setLanguage(next: Language) {
  await i18next.changeLanguage(next);
  try { localStorage.setItem('bely-language', next); } catch { document.documentElement.dataset.languageStorage = 'unavailable'; }
  const url = new URL(location.href);
  url.searchParams.set('lang', next);
  history.replaceState(null, '', url);
  applyLanguage();
  window.dispatchEvent(new CustomEvent('bely-language'));
}

applyLanguage();