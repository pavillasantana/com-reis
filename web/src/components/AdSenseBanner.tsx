import React, { useEffect } from 'react';
import { usePremium } from '../hooks/usePremium';
import { ADSENSE_CLIENT_ID } from '../constants/config';

interface AdSenseBannerProps {
  style?: React.CSSProperties;
  className?: string;
  adSlot: string; // The AdSense Slot ID
}

export function AdSenseBanner({ style, className, adSlot }: AdSenseBannerProps) {
  const { showAds } = usePremium();

  useEffect(() => {
    if (!showAds) return;
    try {
      if (window) {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense banner failed to load:', e);
    }
  }, [showAds]);

  if (!showAds) return null;

  // AdSense inativo: não renderiza até que o publisher ID real seja configurado no .env
  if (!ADSENSE_CLIENT_ID || ADSENSE_CLIENT_ID === 'ca-pub-0000000000000000') return null;

  return (
    <div style={{ overflow: 'hidden', textAlign: 'center', ...style }} className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '90px' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}
