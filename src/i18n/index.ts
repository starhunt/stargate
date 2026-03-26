/**
 * i18n 시스템 - Obsidian 언어 자동 감지 + 수동 override
 */

import { ko, TranslationKeys } from './ko'
import { en } from './en'

export type SupportedLocale = 'ko' | 'en' | 'auto'

const translations: Record<string, TranslationKeys> = { ko, en }

/** 현재 활성 로케일 */
let currentLocale: SupportedLocale = 'auto'

/** Obsidian에서 감지된 로케일 캐시 */
let detectedLocale: string = 'ko'

/** 로케일 설정 */
export function setLocale(locale: SupportedLocale): void {
  currentLocale = locale
}

/** Obsidian 로케일 감지 결과 설정 */
export function setDetectedLocale(locale: string): void {
  detectedLocale = locale
}

/** 현재 유효 로케일 반환 */
function getEffectiveLocale(): string {
  if (currentLocale !== 'auto') {
    return currentLocale
  }
  // Obsidian 감지 로케일에서 언어 코드만 추출 (예: 'ko-KR' → 'ko')
  const lang = detectedLocale.split('-')[0]
  return translations[lang] ? lang : 'en'
}

/** 현재 번역 객체 반환 */
export function getTranslations(): TranslationKeys {
  const locale = getEffectiveLocale()
  return translations[locale] || translations['en']
}

/**
 * 번역 함수 (축약형)
 * 사용법: t().settings.title
 */
export function t(): TranslationKeys {
  return getTranslations()
}

export type { TranslationKeys }
