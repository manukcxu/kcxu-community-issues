import { useState, useEffect } from 'react';

export function useLanguage() {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('kcxu_lang') || 'en';
  });

  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('kcxu_lang', newLang);
  };

  return { lang, changeLang };
}