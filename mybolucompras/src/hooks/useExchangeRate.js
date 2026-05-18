import { useState, useEffect } from 'react';

let _cachedRate = null;
let _cacheTime = 0;
const CACHE_MS = 5 * 60 * 1000;

export function useExchangeRate() {
  const [usdToArs, setUsdToArs] = useState(_cachedRate);
  const [loading, setLoading] = useState(!_cachedRate);

  useEffect(() => {
    if (_cachedRate && Date.now() - _cacheTime < CACHE_MS) {
      setUsdToArs(_cachedRate);
      setLoading(false);
      return;
    }

    fetch('https://api.bluelytics.com.ar/v2/latest')
      .then(r => r.json())
      .then(data => {
        const rate = data?.oficial?.value_sell;
        if (rate) {
          _cachedRate = rate;
          _cacheTime = Date.now();
          setUsdToArs(rate);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { usdToArs, loading };
}
