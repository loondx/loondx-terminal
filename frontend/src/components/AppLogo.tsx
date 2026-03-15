import React from 'react';
import { APP_CONFIG } from '../config';
import logo from '../assets/loondx-logo.png';

interface AppLogoProps {
  className?: string;
  hiddenOnMobile?: boolean;
  /** Height of the logo image, e.g. 'h-[20px]' or 'h-[48px]'. Defaults to h-[20px]. */
  logoSize?: string;
  /** When true, hides the text and only shows the image mark — great for tight navbars. */
  textHidden?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = '', hiddenOnMobile = false, logoSize = 'h-[20px]', textHidden = false }) => {
  return (
    <div className={`font-mono text-[14px] font-bold tracking-[.25em] text-brand-bl whitespace-nowrap text-shadow-bl flex items-center gap-3 ${hiddenOnMobile ? 'hidden sm:flex' : 'flex'} ${className}`}>
      <img src={logo} alt="LOONDX Logo" className={`${logoSize} w-auto opacity-90 brightness-110 drop-shadow-[0_0_8px_rgba(90,140,255,0.5)]`} />
      {!textHidden && (
        <div>
          {APP_CONFIG.name}<em className="text-brand-t3 not-italic font-light"> {APP_CONFIG.title}</em><sup className="text-[8px] text-brand-tl tracking-[.1em] align-super">{APP_CONFIG.version}</sup>
        </div>
      )}
    </div>
  );
};
