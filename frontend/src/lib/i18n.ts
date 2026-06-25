import { createContext, createElement, type ReactNode, useContext, useEffect, useState } from 'react'

export type Lang = 'en' | 'ur'
export const LANG_STORAGE_KEY = 'scamshield_lang'

type TranslationKeys =
  | 'home'
  | 'message'
  | 'url'
  | 'profile'
  | 'image'
  | 'chat'
  | 'community'
  | 'learn'
  | 'report'
  | 'account'
  | 'admin'
  | 'fastMode'
  | 'fastModeHint'
  | 'tagline'
  | 'scamAnalyzer'
  | 'urlScanner'
  | 'profileDetector'
  | 'imageVerifier'
  | 'securityLearning'
  | 'analyzeMessage'
  | 'scanProfile'
  | 'scanUrl'
  | 'submit'
  | 'warning'
  | 'openLink'
  | 'dontOpen'
  | 'safeToOpen'
  | 'loading'
  | 'tryAgain'

const dict = {
  en: {
    home: 'Home',
    message: 'Message',
    url: 'URL',
    profile: 'Profile',
    image: 'Image',
    chat: 'Chat',
    community: 'Community',
    learn: 'Learn',
    report: 'Report',
    account: 'Account',
    admin: 'Admin',
    fastMode: 'Battery saver',
    fastModeHint: 'Quick scan only — less AI, faster',
    tagline: 'Protect yourself from social media scams',
    scamAnalyzer: 'Scam Message Analyzer',
    urlScanner: 'URL / Link Scanner',
    profileDetector: 'Fake Profile Detector',
    imageVerifier: 'Image Verification',
    securityLearning: 'Security Learning Center',
    analyzeMessage: 'Analyze Message',
    scanProfile: 'Analyze Profile',
    scanUrl: 'Scan URL',
    submit: 'Submit',
    warning: 'Warning',
    openLink: 'Open link safely',
    dontOpen: 'Do not open this link',
    safeToOpen: 'This link looks low risk.',
    loading: 'Loading…',
    tryAgain: 'Try again in a moment.',
  },
  ur: {
    home: 'Home',
    message: 'Message',
    url: 'URL',
    profile: 'Profile',
    image: 'Image',
    chat: 'Chat',
    community: 'Community',
    learn: 'Seekho',
    report: 'Report',
    account: 'Account',
    admin: 'Admin',
    fastMode: 'Battery saver',
    fastModeHint: 'Sirf quick scan — kam battery, tez',
    tagline: 'Social media scams se khud ko bachayein',
    scamAnalyzer: 'Scam Message Analyzer',
    urlScanner: 'URL / Link Scanner',
    profileDetector: 'Fake Profile Detector',
    imageVerifier: 'Image Verification',
    securityLearning: 'Security Learning Center',
    analyzeMessage: 'Analyze Message',
    scanProfile: 'Analyze Profile',
    scanUrl: 'Scan URL',
    submit: 'Submit',
    warning: 'Warning',
    openLink: 'Open link safely',
    dontOpen: 'Do not open this link',
    safeToOpen: 'Ye link low-risk lag raha hai.',
    loading: 'Loading…',
    tryAgain: 'Thora baad dobara koshish karein.',
  },
} as const

export function t(lang: Lang, key: TranslationKeys): string {
  return dict[lang][key] ?? dict.en[key]
}

interface LangContextType {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  setLang: () => {},
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY)
    if (saved === 'ur') {
      setLangState('ur')
    }
  }, [])

  function setLang(lang: Lang) {
    setLangState(lang)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang)
    }
  }

  return createElement(LangContext.Provider, { value: { lang, setLang } }, children)
}

export function useLang() {
  return useContext(LangContext)
}
