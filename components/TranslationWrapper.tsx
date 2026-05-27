'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useGlobalTranslations } from '@/lib/global-translation-manager'

interface TranslationWrapperProps {
  children: React.ReactNode
}

// Map our language codes → Google Translate language codes
const GOOGLE_LANG_MAP: Record<string, string> = {
  en: 'en',
  ta: 'ta',
  hi: 'hi',
  kn: 'kn',
  te: 'te',
  ks: 'ur', // Kashmiri uses Urdu script in Google Translate
}

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
    google?: any
  }
}

export default function TranslationWrapper({ children }: TranslationWrapperProps) {
  const { currentLanguage } = useLanguage()
  const globalState = useGlobalTranslations()
  const [mounted, setMounted] = useState(false)
  const prevLangRef = useRef<string>('en')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Inject Google Translate script once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          { pageLanguage: 'en', autoDisplay: false },
          'google_translate_element'
        )
      }
    }

    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  // Apply translation when language changes — no blinking, no reload loops
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return

    const targetLang = GOOGLE_LANG_MAP[currentLanguage] || 'en'
    const prevLang = prevLangRef.current

    // Skip if language hasn't actually changed
    if (targetLang === prevLang) return
    prevLangRef.current = targetLang

    if (targetLang === 'en') {
      // Only reload if we were on a translated page (prevent reload loops)
      const wasTranslated = sessionStorage.getItem('gt_translated') === '1'
      if (!wasTranslated) return

      // Clear the googtrans cookie on all domain variants
      ;['', window.location.hostname, '.' + window.location.hostname].forEach(domain => {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/${domain ? '; domain=' + domain : ''}`
      })
      sessionStorage.removeItem('gt_translated')
      window.location.reload()
      return
    }

    // Mark that page is in translated state
    sessionStorage.setItem('gt_translated', '1')

    // Set googtrans cookie
    document.cookie = `googtrans=/en/${targetLang}; path=/`
    document.cookie = `googtrans=/en/${targetLang}; path=/; domain=${window.location.hostname}`

    // Trigger the hidden Google Translate select widget
    const triggerTranslate = () => {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement
      if (select) {
        select.value = targetLang
        select.dispatchEvent(new Event('change'))
      }
    }

    // Try immediately + retry if widget not fully loaded
    triggerTranslate()
    const t1 = setTimeout(triggerTranslate, 800)
    const t2 = setTimeout(triggerTranslate, 2000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [currentLanguage, mounted])

  if (!mounted) {
    return <div className="min-h-screen bg-space-dark" />
  }

  return (
    <>
      {/* Hidden Google Translate widget — controlled via JS */}
      <div id="google_translate_element" style={{ display: 'none' }} />

      {/* Suppress Google Translate toolbar */}
      <style>{`
        .goog-te-banner-frame, .skiptranslate { display: none !important; }
        body { top: 0 !important; }
        .goog-te-gadget { display: none !important; }
      `}</style>

      {/* NO key= prop here — prevents unmount/remount blink */}
      <div data-language={currentLanguage} data-global-lang={globalState.language}>
        {children}
      </div>
    </>
  )
}