import React from 'react';
import { APP_CONFIG } from '../config';

interface AppLogoProps {
  className?: string;
  hiddenOnMobile?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = '', hiddenOnMobile = false }) => {
  return (
    <div className={`font-mono text-[14px] font-bold tracking-[.25em] text-brand-bl whitespace-nowrap text-shadow-bl ${hiddenOnMobile ? 'hidden sm:block' : ''} ${className}`}>
      {APP_CONFIG.name}<em className="text-brand-t3 not-italic font-light"> {APP_CONFIG.title}</em><sup className="text-[8px] text-brand-tl tracking-[.1em] align-super">{APP_CONFIG.version}</sup>
    </div>
  );
};
