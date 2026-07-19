import React from 'react';
import { AdSenseBanner } from './AdSenseBanner';

interface AdBannerProps {
  adSlot?: string;
  style?: React.CSSProperties;
}

export const AdBanner: React.FC<AdBannerProps> = ({ adSlot, style }) => {
  return (
    <AdSenseBanner
      adSlot={adSlot ?? '0000000000'}
      style={{ margin: '16px 0', ...style }}
    />
  );
};
