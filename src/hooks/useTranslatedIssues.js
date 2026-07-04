import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const LANG_NAMES = { en: 'English', es: 'Spanish', vi: 'Vietnamese', zh: 'Simplified Chinese', tl: 'Tagalog' };

function applyMap(issues, map) {
  return issues.map(i => map[i.id]
    ? { ...i, title: map[i.id].title || i.title, description: map[i.id].description || i.description }
    : i);
}

export function useTranslatedIssues(issues, lang) {
  const [translated, setTranslated] = useState(issues);

  useEffect(() => {
    let active = true;
    if (issues.length === 0) { setTranslated(issues); return; }
    const toTranslate = issues.filter(i => (i.submitter_language || 'en') !== lang);
    if (toTranslate.length === 0) { setTranslated(issues); return; }

    const cacheKey = `kcxu_tr_${lang}_${issues.map(i => i.id).join('_')}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setTranslated(applyMap(issues, JSON.parse(cached))); return; }

    setTranslated(issues);
    base44.integrations.Core.InvokeLLM({
      prompt: `Translate the title and description of each community issue below into ${LANG_NAMES[lang] || 'English'}. Keep the same ids. Return only the translations, no commentary.\n\n${JSON.stringify(toTranslate.map(i => ({ id: i.id, title: i.title, description: i.description })))}`,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      }
    }).then(res => {
      if (!active) return;
      const map = {};
      (res.items || []).forEach(it => { map[it.id] = it; });
      sessionStorage.setItem(cacheKey, JSON.stringify(map));
      setTranslated(applyMap(issues, map));
    }).catch(e => console.error('Issue translation failed', e));

    return () => { active = false; };
  }, [issues, lang]);

  return translated;
}