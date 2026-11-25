import React from 'react';
import type { AppSectionId } from '../../types/media';

interface IconProps {
  className?: string;
}

/**
 * 1. Live German Radio — 3D glassmorphic petrol & gold retro-modern receiver
 */
export const RadioSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="df-radio-aura" cx="50%" cy="52%" r="46%">
        <stop offset="0%" stopColor="#26D7C4" stopOpacity="0.34" />
        <stop offset="100%" stopColor="#093D38" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="df-radio-body" x1="8" y1="20" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1CA394" stopOpacity="0.92" />
        <stop offset="55%" stopColor="#0C4C45" stopOpacity="0.96" />
        <stop offset="100%" stopColor="#052622" />
      </linearGradient>
      <linearGradient id="df-radio-gold" x1="12" y1="12" x2="52" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE89E" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8A6114" />
      </linearGradient>
      <linearGradient id="df-radio-glass" x1="12" y1="22" x2="48" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#7DF9EC" stopOpacity="0.08" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="34" r="27" fill="url(#df-radio-aura)" />
    <ellipse cx="32" cy="54" rx="20" ry="4" fill="#04221E" fillOpacity="0.24" />
    {/* Antenna */}
    <path d="M18 22L47 8" stroke="url(#df-radio-gold)" strokeWidth="2.8" strokeLinecap="round" />
    <circle cx="48" cy="8" r="3" fill="#E8C35A" stroke="#093D38" strokeWidth="1" />
    {/* 3D Side depth & main cabinet */}
    <rect x="8" y="21" width="48" height="31" rx="8" fill="#042420" />
    <rect x="8" y="19" width="46" height="31" rx="8" fill="url(#df-radio-body)" stroke="url(#df-radio-gold)" strokeWidth="2" />
    {/* Glass sheen */}
    <path d="M12 22C12 20.5 13.5 20 15 20H47C49 20 51 21 52 22.5C41 26.5 23 26.5 12 23.5V22Z" fill="url(#df-radio-glass)" />
    {/* Illuminated tuning window */}
    <rect x="31" y="24.5" width="18" height="9" rx="3" fill="#062925" stroke="url(#df-radio-gold)" strokeWidth="1.3" />
    <line x1="34" y1="29" x2="46" y2="29" stroke="#7FF9EB" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="38.5" y="26.2" width="2.2" height="5.6" rx="1" fill="#F16A4B" />
    {/* Speaker grille & 3D dial */}
    <circle cx="20" cy="35" r="8" fill="#072D29" stroke="url(#df-radio-gold)" strokeWidth="1.6" />
    <circle cx="20" cy="35" r="4.2" fill="url(#df-radio-gold)" />
    <circle cx="19" cy="33.8" r="1.3" fill="#FFF7D6" />
    <line x1="32" y1="38.5" x2="48" y2="38.5" stroke="#80ECE0" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
    <line x1="32" y1="43" x2="48" y2="43" stroke="#80ECE0" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
    <circle cx="45" cy="41" r="3" fill="url(#df-radio-gold)" />
  </svg>
);

/**
 * 2. German Newsroom — 3D holographic globe & live broadcast signal
 */
export const NewsSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="df-news-sphere" cx="38%" cy="32%" r="65%">
        <stop offset="0%" stopColor="#8BF8EC" stopOpacity="0.95" />
        <stop offset="45%" stopColor="#15887B" stopOpacity="0.88" />
        <stop offset="100%" stopColor="#06312C" stopOpacity="0.96" />
      </radialGradient>
      <linearGradient id="df-news-ring" x1="10" y1="14" x2="54" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE9A3" />
        <stop offset="55%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#D85A40" />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#04221E" fillOpacity="0.22" />
    <circle cx="31" cy="32" r="20" fill="url(#df-news-sphere)" stroke="url(#df-news-ring)" strokeWidth="2" />
    {/* Glass latitude/longitude hologram grid */}
    <ellipse cx="31" cy="32" rx="9.5" ry="20" stroke="#D2FFF9" strokeOpacity="0.6" strokeWidth="1.5" />
    <path d="M12.5 25.5C23 28.5 39 28.5 49.5 25.5" stroke="#D2FFF9" strokeOpacity="0.65" strokeWidth="1.5" />
    <path d="M12.5 38.5C23 35.5 39 35.5 49.5 38.5" stroke="#D2FFF9" strokeOpacity="0.5" strokeWidth="1.5" />
    {/* Specular highlight */}
    <path d="M19 20C22 15.5 27.5 14 32 14.5" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="2.4" strokeLinecap="round" />
    {/* Live beacon badge */}
    <path d="M43 10C49.5 13 54 19 55 26" stroke="#F06A4D" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="47.5" cy="14.5" r="5" fill="#E34F33" stroke="#FFF4D8" strokeWidth="1.6" />
    <circle cx="46.2" cy="13.2" r="1.4" fill="#FFFFFF" />
  </svg>
);

/**
 * 3. Newspapers & Magazines — Floating layered 3D broadsheet with gold masthead
 */
export const NewspaperSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-paper-back" x1="18" y1="12" x2="54" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1A9889" stopOpacity="0.75" />
        <stop offset="100%" stopColor="#07342F" stopOpacity="0.92" />
      </linearGradient>
      <linearGradient id="df-paper-front" x1="10" y1="8" x2="46" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="65%" stopColor="#F4EFE2" />
        <stop offset="100%" stopColor="#DDD3BC" />
      </linearGradient>
      <linearGradient id="df-paper-gold" x1="14" y1="14" x2="38" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE694" />
        <stop offset="100%" stopColor="#C8962E" />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="21" ry="3.5" fill="#04221E" fillOpacity="0.22" />
    {/* Rear glossy magazine layer */}
    <rect x="20" y="13" width="32" height="39" rx="6" transform="rotate(6 36 32)" fill="url(#df-paper-back)" stroke="#D4AF37" strokeWidth="1.5" />
    {/* Front 3D newspaper sheet */}
    <rect x="10" y="10" width="35" height="42" rx="6" fill="url(#df-paper-front)" stroke="#0D4A42" strokeWidth="2" />
    {/* Masthead gold bar + German accent line */}
    <rect x="15" y="15.5" width="25" height="9" rx="2.5" fill="url(#df-paper-gold)" />
    <rect x="15" y="27" width="12" height="1.8" rx="0.9" fill="#111111" />
    <rect x="27" y="27" width="7" height="1.8" rx="0.9" fill="#DD0000" />
    <rect x="34" y="27" width="6" height="1.8" rx="0.9" fill="#E8B923" />
    {/* Copy lines */}
    <rect x="15" y="32" width="25" height="2.6" rx="1.3" fill="#0D4A42" fillOpacity="0.82" />
    <rect x="15" y="37.5" width="21" height="2.6" rx="1.3" fill="#0D4A42" fillOpacity="0.55" />
    <rect x="15" y="43" width="15" height="2.6" rx="1.3" fill="#D85A40" />
  </svg>
);

/**
 * 4. German Studio (formerly YouTube Channels) — 3D holographic studio play display + German ribbon glow
 */
export const YouTubeSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-studio-frame" x1="8" y1="12" x2="56" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1CB5A3" />
        <stop offset="55%" stopColor="#0A453E" />
        <stop offset="100%" stopColor="#04221F" />
      </linearGradient>
      <linearGradient id="df-studio-gold" x1="8" y1="12" x2="56" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE89C" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8C6214" />
      </linearGradient>
      <linearGradient id="df-studio-play" x1="25" y1="21" x2="43" y2="39" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF7254" />
        <stop offset="100%" stopColor="#C8291A" />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="20" ry="3.5" fill="#04221E" fillOpacity="0.24" />
    {/* Stand base */}
    <path d="M22 52H42" stroke="url(#df-studio-gold)" strokeWidth="3.2" strokeLinecap="round" />
    <rect x="29" y="45" width="6" height="7" rx="1.5" fill="#093D38" />
    {/* 3D Glass screen */}
    <rect x="7" y="13" width="50" height="34" rx="9" fill="#04221E" />
    <rect x="7" y="11" width="50" height="34" rx="9" fill="url(#df-studio-frame)" stroke="url(#df-studio-gold)" strokeWidth="2.2" />
    {/* German flag thin edge accent inside studio screen */}
    <rect x="13" y="15.5" width="12" height="2" rx="1" fill="#111111" />
    <rect x="26" y="15.5" width="12" height="2" rx="1" fill="#DD0000" />
    <rect x="39" y="15.5" width="12" height="2" rx="1" fill="#FFCE00" />
    {/* Glass specular sheen */}
    <path d="M12 16C14 13 20 12.5 48 13C40 20 22 22 10 21V18C10 17 11 16.5 12 16Z" fill="#FFFFFF" fillOpacity="0.16" />
    {/* 3D Floating play jewel */}
    <path d="M26 21.5L43 29.5L26 37.5V21.5Z" fill="url(#df-studio-play)" stroke="#FFF2CC" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

/**
 * 5. Documentaries & Investigations — 3D cinema documentary camera with glass lens
 */
export const DocumentarySvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-doc-body" x1="8" y1="24" x2="44" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1AA394" />
        <stop offset="100%" stopColor="#062B27" />
      </linearGradient>
      <linearGradient id="df-doc-gold" x1="12" y1="10" x2="54" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE99E" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8E6514" />
      </linearGradient>
      <radialGradient id="df-doc-lens" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#A9FFF5" />
        <stop offset="55%" stopColor="#18887B" />
        <stop offset="100%" stopColor="#04221F" />
      </radialGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="20" ry="3.5" fill="#04221E" fillOpacity="0.22" />
    {/* Dual 3D reels */}
    <circle cx="19" cy="18" r="7.5" fill="#093D38" stroke="url(#df-doc-gold)" strokeWidth="2" />
    <circle cx="19" cy="18" r="2.5" fill="#FFE694" />
    <circle cx="35" cy="16.5" r="9" fill="#093D38" stroke="url(#df-doc-gold)" strokeWidth="2" />
    <circle cx="35" cy="16.5" r="3" fill="#FFE694" />
    {/* Camera body */}
    <rect x="8" y="25" width="34" height="25" rx="7" fill="url(#df-doc-body)" stroke="url(#df-doc-gold)" strokeWidth="2" />
    {/* Projecting lens cone */}
    <path d="M42 31L55 24.5V49.5L42 43V31Z" fill="#0D4A42" stroke="url(#df-doc-gold)" strokeWidth="2" strokeLinejoin="round" />
    {/* Luminous glass lens */}
    <circle cx="25" cy="37.5" r="7.5" fill="url(#df-doc-lens)" stroke="#FFE694" strokeWidth="1.6" />
    <circle cx="22.8" cy="35" r="2" fill="#FFFFFF" fillOpacity="0.85" />
  </svg>
);

/**
 * 6. German Podcasts — 3D glassmorphic studio condenser mic & holographic waves
 */
export const PodcastSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-pod-capsule" x1="23" y1="9" x2="41" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF0B8" />
        <stop offset="42%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#0B4740" />
      </linearGradient>
      <linearGradient id="df-pod-stand" x1="16" y1="26" x2="48" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2CD6C2" />
        <stop offset="100%" stopColor="#083B35" />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="57" rx="16" ry="3.2" fill="#04221E" fillOpacity="0.22" />
    {/* Holographic audio waves */}
    <path d="M12 24V34" stroke="#26D7C4" strokeWidth="2.8" strokeLinecap="round" strokeOpacity="0.85" />
    <path d="M7 27V31" stroke="#26D7C4" strokeWidth="2.6" strokeLinecap="round" strokeOpacity="0.55" />
    <path d="M52 24V34" stroke="#26D7C4" strokeWidth="2.8" strokeLinecap="round" strokeOpacity="0.85" />
    <path d="M57 27V31" stroke="#26D7C4" strokeWidth="2.6" strokeLinecap="round" strokeOpacity="0.55" />
    {/* Capsule */}
    <rect x="23" y="9" width="18" height="27" rx="9" fill="url(#df-pod-capsule)" stroke="#093D38" strokeWidth="2" />
    <line x1="27.5" y1="16.5" x2="36.5" y2="16.5" stroke="#093D38" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="27.5" y1="21.5" x2="36.5" y2="21.5" stroke="#D85A40" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="27.5" y1="26.5" x2="36.5" y2="26.5" stroke="#093D38" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M26 14C26 11.5 28.5 11 30 11" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" />
    {/* Cradle & Stand */}
    <path d="M17 28C17 36.28 23.72 43 32 43C40.28 43 47 36.28 47 28" stroke="url(#df-pod-stand)" strokeWidth="3.2" strokeLinecap="round" />
    <line x1="32" y1="43" x2="32" y2="53" stroke="#093D38" strokeWidth="3.2" strokeLinecap="round" />
    <rect x="21" y="51" width="22" height="4.5" rx="2.2" fill="#D4AF37" stroke="#093D38" strokeWidth="1.3" />
  </svg>
);

/**
 * 7. Movies & Series — 3D clapperboard + translucent glass cinema reel
 */
export const MoviesSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-mov-slate" x1="10" y1="24" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#167A6F" />
        <stop offset="100%" stopColor="#052420" />
      </linearGradient>
      <linearGradient id="df-mov-gold" x1="8" y1="10" x2="56" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE99E" />
        <stop offset="100%" stopColor="#C8962E" />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="21" ry="3.5" fill="#04221E" fillOpacity="0.22" />
    {/* Clapper top arm */}
    <path d="M9 21L52 10L54 17.5L11 28.5L9 21Z" fill="#0B3B35" stroke="url(#df-mov-gold)" strokeWidth="2" strokeLinejoin="round" />
    <path d="M18 19L22 25.5M29 16L33 22.5M40 13L44 19.5" stroke="#FFE99E" strokeWidth="2.6" strokeLinecap="round" />
    {/* Main Slate */}
    <rect x="9" y="25" width="46" height="28" rx="6" fill="url(#df-mov-slate)" stroke="url(#df-mov-gold)" strokeWidth="2" />
    <path d="M13 28H51C42 33 22 35 13 33V28Z" fill="#FFFFFF" fillOpacity="0.14" />
    {/* Play crystal inside */}
    <circle cx="32" cy="39" r="9.5" fill="#042420" fillOpacity="0.65" stroke="url(#df-mov-gold)" strokeWidth="1.5" />
    <path d="M29.5 34.5L38 39L29.5 43.5V34.5Z" fill="#F06A4D" stroke="#FFF2CC" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

/**
 * 8. German Learning (A1–C2) — 3D emerald-gold mortarboard & faceted glass prism
 */
export const LearningSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-learn-cap" x1="8" y1="12" x2="56" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#26C2B0" />
        <stop offset="55%" stopColor="#0D574E" />
        <stop offset="100%" stopColor="#062D28" />
      </linearGradient>
      <linearGradient id="df-learn-gold" x1="14" y1="12" x2="54" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE99E" />
        <stop offset="100%" stopColor="#C8962E" />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="19" ry="3.5" fill="#04221E" fillOpacity="0.22" />
    {/* Lower dome */}
    <path d="M17 28V41C17 45.8 23.7 49.5 32 49.5C40.3 49.5 47 45.8 47 41V28" fill="#093D38" stroke="url(#df-learn-gold)" strokeWidth="2" strokeLinecap="round" />
    {/* Floating 3D diamond cap */}
    <path d="M32 10L57 22L32 34L7 22L32 10Z" fill="url(#df-learn-cap)" stroke="url(#df-learn-gold)" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M15 21.5L32 13.5L49 21.5" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.8" strokeLinecap="round" />
    {/* Gold tassel */}
    <path d="M51 25V41" stroke="#F06A4D" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="51" cy="43.5" r="3.4" fill="url(#df-learn-gold)" stroke="#093D38" strokeWidth="1.2" />
    {/* Core center star */}
    <circle cx="32" cy="22" r="2.6" fill="#FFE99E" />
  </svg>
);

/**
 * 9. German Reading — 3D open illuminated hardcover book with glass page highlight
 */
export const ReadingSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-read-left" x1="9" y1="14" x2="32" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#EAE2CE" />
      </linearGradient>
      <linearGradient id="df-read-right" x1="32" y1="14" x2="55" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FAF7EE" />
        <stop offset="100%" stopColor="#DDD2B8" />
      </linearGradient>
      <linearGradient id="df-read-gold" x1="8" y1="12" x2="56" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE796" />
        <stop offset="100%" stopColor="#C8962E" />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="22" ry="3.5" fill="#04221E" fillOpacity="0.22" />
    {/* Outer emerald cover */}
    <path d="M7 18C14 15.5 24 16 32 20C40 16 50 15.5 57 18V50C49 48 40 48.5 32 52C24 48.5 15 48 7 50V18Z" fill="#093D38" stroke="url(#df-read-gold)" strokeWidth="2" strokeLinejoin="round" />
    {/* Left & right curved pages */}
    <path d="M32 18C26 14.5 17 13.5 10 15.5V46C17 44 26 44.8 32 48.5V18Z" fill="url(#df-read-left)" stroke="#0D4A42" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M32 18C38 14.5 47 13.5 54 15.5V46C47 44 38 44.8 32 48.5V18Z" fill="url(#df-read-right)" stroke="#0D4A42" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Page lines & crimson ribbon bookmark */}
    <line x1="15" y1="24" x2="26" y2="25" stroke="#C8962E" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="15" y1="30.5" x2="26" y2="31.5" stroke="#0D4A42" strokeOpacity="0.65" strokeWidth="2" strokeLinecap="round" />
    <line x1="15" y1="37" x2="24" y2="37.8" stroke="#0D4A42" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
    <line x1="38" y1="25" x2="49" y2="24" stroke="#0D4A42" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
    <line x1="38" y1="31.5" x2="49" y2="30.5" stroke="#0D4A42" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
    <path d="M42 15V29L45 26.5L48 29V14.5" fill="#E34F33" />
  </svg>
);

/**
 * 10. Culture & History — 3D golden Brandenburg/classical portal with glass glow
 */
export const CultureSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-cult-gold" x1="10" y1="10" x2="54" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF0B8" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8E6514" />
      </linearGradient>
      <radialGradient id="df-cult-glow" cx="50%" cy="60%" r="42%">
        <stop offset="0%" stopColor="#65F5E4" stopOpacity="0.42" />
        <stop offset="100%" stopColor="#093D38" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="22" ry="3.5" fill="#04221E" fillOpacity="0.22" />
    <circle cx="32" cy="36" r="21" fill="url(#df-cult-glow)" />
    {/* Pediment & crown */}
    <path d="M32 9L54 21H10L32 9Z" fill="#0B4740" stroke="url(#df-cult-gold)" strokeWidth="2.2" strokeLinejoin="round" />
    <circle cx="32" cy="16" r="2.2" fill="#FFE99E" />
    {/* Columns */}
    <rect x="14" y="22" width="5" height="24" rx="1.5" fill="url(#df-cult-gold)" stroke="#062D28" strokeWidth="1" />
    <rect x="24.5" y="22" width="5" height="24" rx="1.5" fill="url(#df-cult-gold)" stroke="#062D28" strokeWidth="1" />
    <rect x="34.5" y="22" width="5" height="24" rx="1.5" fill="url(#df-cult-gold)" stroke="#062D28" strokeWidth="1" />
    <rect x="45" y="22" width="5" height="24" rx="1.5" fill="url(#df-cult-gold)" stroke="#062D28" strokeWidth="1" />
    {/* Stepped plinth */}
    <rect x="8" y="46" width="48" height="6" rx="2.5" fill="#093D38" stroke="url(#df-cult-gold)" strokeWidth="1.8" />
  </svg>
);

/**
 * 11. Science & Tech — 3D holographic orbital crystal sphere
 */
export const ScienceSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="df-sci-core" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#FFF0B8" />
        <stop offset="45%" stopColor="#F06A4D" />
        <stop offset="100%" stopColor="#8F2212" />
      </radialGradient>
      <radialGradient id="df-sci-aura" cx="50%" cy="50%" r="48%">
        <stop offset="0%" stopColor="#3EF2DF" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#093D38" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="26" fill="url(#df-sci-aura)" />
    <ellipse cx="32" cy="32" rx="23" ry="9" transform="rotate(32 32 32)" stroke="#1EB8A6" strokeWidth="2.4" />
    <ellipse cx="32" cy="32" rx="23" ry="9" transform="rotate(-32 32 32)" stroke="#D4AF37" strokeWidth="2.4" />
    <ellipse cx="32" cy="32" rx="23" ry="9" transform="rotate(90 32 32)" stroke="#7FF9EB" strokeOpacity="0.7" strokeWidth="2" />
    {/* Electron nodes */}
    <circle cx="15" cy="21" r="2.8" fill="#FFE99E" />
    <circle cx="49" cy="43" r="2.8" fill="#68F7E6" />
    <circle cx="49" cy="21" r="2.5" fill="#F06A4D" />
    {/* 3D Nucleus */}
    <circle cx="32" cy="32" r="6.5" fill="url(#df-sci-core)" stroke="#FFF2CC" strokeWidth="1.5" />
    <circle cx="30" cy="30" r="1.8" fill="#FFFFFF" fillOpacity="0.85" />
  </svg>
);

/**
 * 12. German Kids Media — 3D faceted glass origami kite
 */
export const KidsSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-kids-top" x1="14" y1="8" x2="50" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE99E" />
        <stop offset="100%" stopColor="#D4AF37" />
      </linearGradient>
      <linearGradient id="df-kids-bot" x1="16" y1="24" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2CD6C2" />
        <stop offset="100%" stopColor="#094A43" />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="57" rx="16" ry="3" fill="#04221E" fillOpacity="0.18" />
    {/* Faceted 3D diamond kite */}
    <path d="M32 7L51 24L32 45L13 24L32 7Z" fill="url(#df-kids-bot)" stroke="#093D38" strokeWidth="2" strokeLinejoin="round" />
    <path d="M32 7L51 24H13L32 7Z" fill="url(#df-kids-top)" fillOpacity="0.92" />
    <path d="M32 7L32 45" stroke="#093D38" strokeWidth="1.8" />
    <path d="M13 24H51" stroke="#F06A4D" strokeWidth="2" />
    {/* Tail */}
    <path d="M32 45C32 51 39 54 46 53C50 52.5 53 50 54.5 48" stroke="#F06A4D" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="46" cy="53" r="2.6" fill="#FFE99E" stroke="#093D38" strokeWidth="1" />
  </svg>
);

/**
 * 13. My Favorites & Lists — 3D holographic faceted crystal heart (directly inspired by holographic heart aesthetic)
 */
export const FavoritesSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="df-fav-aura" cx="50%" cy="46%" r="48%">
        <stop offset="0%" stopColor="#FF7C62" stopOpacity="0.38" />
        <stop offset="60%" stopColor="#26D7C4" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#093D38" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="df-fav-glass" x1="12" y1="12" x2="52" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF967D" />
        <stop offset="45%" stopColor="#E24E36" />
        <stop offset="100%" stopColor="#8F1D2C" />
      </linearGradient>
      <linearGradient id="df-fav-rim" x1="14" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF0B8" />
        <stop offset="50%" stopColor="#65F5E4" />
        <stop offset="100%" stopColor="#FFB09C" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="27" fill="url(#df-fav-aura)" />
    <ellipse cx="32" cy="56" rx="15" ry="3" fill="#04221E" fillOpacity="0.22" />
    {/* 3D Holographic Crystal Heart */}
    <path
      d="M32 52C32 52 10 38.5 10 23C10 15.8 15.6 10.5 22.5 10.5C26.8 10.5 30.2 12.6 32 15.8C33.8 12.6 37.2 10.5 41.5 10.5C48.4 10.5 54 15.8 54 23C54 38.5 32 52 32 52Z"
      fill="url(#df-fav-glass)"
      stroke="url(#df-fav-rim)"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    {/* Internal glass facets */}
    <path d="M32 16V51.5" stroke="#FFFFFF" strokeOpacity="0.32" strokeWidth="1.4" />
    <path d="M12 24L32 31L52 24" stroke="#7DF9EC" strokeOpacity="0.45" strokeWidth="1.3" />
    <path d="M19 16.5C16.5 18 15 20.4 15 23.2" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="2.4" strokeLinecap="round" />
    {/* Sparkle dots */}
    <circle cx="48" cy="14" r="1.8" fill="#FFE99E" />
    <circle cx="15" cy="40" r="1.4" fill="#7DF9EC" />
  </svg>
);

/**
 * 14. My Learning Library — 3D emerald, gold, and coral archive volumes
 */
export const LibrarySvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-lib-1" x1="10" y1="11" x2="21" y2="49" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#26C2B0" />
        <stop offset="100%" stopColor="#07342F" />
      </linearGradient>
      <linearGradient id="df-lib-2" x1="23" y1="15" x2="34" y2="49" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE99E" />
        <stop offset="100%" stopColor="#B8821D" />
      </linearGradient>
      <linearGradient id="df-lib-3" x1="37" y1="13" x2="54" y2="49" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF8266" />
        <stop offset="100%" stopColor="#A62A1B" />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="22" ry="3.2" fill="#04221E" fillOpacity="0.22" />
    <rect x="10" y="11" width="11.5" height="38" rx="3" fill="url(#df-lib-1)" stroke="#062D28" strokeWidth="1.6" />
    <rect x="24" y="15" width="11.5" height="34" rx="3" fill="url(#df-lib-2)" stroke="#062D28" strokeWidth="1.6" />
    <path d="M38.5 14L49.5 11.5L55 47.5L44 50L38.5 14Z" fill="url(#df-lib-3)" stroke="#062D28" strokeWidth="1.6" strokeLinejoin="round" />
    {/* Spine bands */}
    <line x1="12.5" y1="19" x2="19" y2="19" stroke="#FFE99E" strokeWidth="2" strokeLinecap="round" />
    <line x1="26.5" y1="23" x2="33" y2="23" stroke="#093D38" strokeWidth="2" strokeLinecap="round" />
    <line x1="41.5" y1="22" x2="48" y2="20.5" stroke="#FFF2CC" strokeWidth="2" strokeLinecap="round" />
    {/* Shelf */}
    <rect x="7" y="49.5" width="50" height="4.5" rx="2.2" fill="#093D38" stroke="#D4AF37" strokeWidth="1.3" />
  </svg>
);

export const SettingsSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-set-gold" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF0B8" />
        <stop offset="50%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8E6514" />
      </linearGradient>
      <radialGradient id="df-set-core" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#72F7E7" />
        <stop offset="55%" stopColor="#127A6E" />
        <stop offset="100%" stopColor="#062B27" />
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="22" stroke="url(#df-set-gold)" strokeWidth="5" strokeDasharray="7 5.5" strokeLinecap="round" />
    <circle cx="32" cy="32" r="15" fill="url(#df-set-core)" stroke="url(#df-set-gold)" strokeWidth="2.2" />
    <circle cx="32" cy="32" r="6" fill="#052522" stroke="#FFE99E" strokeWidth="1.8" />
  </svg>
);

export const FlowJourneySvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="df-fj-gold" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF0B8" />
        <stop offset="50%" stopColor="#E8C35A" />
        <stop offset="100%" stopColor="#B8821D" />
      </linearGradient>
      <linearGradient id="df-fj-orb" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3EF2DF" />
        <stop offset="55%" stopColor="#127A6E" />
        <stop offset="100%" stopColor="#052622" />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="56" rx="19" ry="3.2" fill="#04221E" fillOpacity="0.22" />
    <circle cx="32" cy="31" r="21" fill="url(#df-fj-orb)" stroke="url(#df-fj-gold)" strokeWidth="2.2" />
    <path d="M18 39L27 29L35 34L46 20" stroke="#FFE99E" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="46" cy="20" r="3.6" fill="#FF7C62" stroke="#FFF2CC" strokeWidth="1.5" />
    <circle cx="27" cy="29" r="2.6" fill="#7FF9EB" />
    <circle cx="18" cy="39" r="2.6" fill="#7FF9EB" />
  </svg>
);

export const BrandCrestSvg: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <img
    src="/brand/deutschflow-logo.png"
    alt="DeutschFlow"
    className={`${className} rounded-xl border border-[#D4AF37]/65 shadow-sm object-cover`}
  />
);

export function renderSectionSvgIcon(id: Exclude<AppSectionId, 'home'>, className = 'w-11 h-11'): React.ReactNode {
  switch (id) {
    case 'radio':
      return <RadioSvgIcon className={className} />;
    case 'news':
      return <NewsSvgIcon className={className} />;
    case 'newspapers':
      return <NewspaperSvgIcon className={className} />;
    case 'youtube':
      return <YouTubeSvgIcon className={className} />;
    case 'documentaries':
      return <DocumentarySvgIcon className={className} />;
    case 'podcasts':
      return <PodcastSvgIcon className={className} />;
    case 'movies':
      return <MoviesSvgIcon className={className} />;
    case 'learning':
      return <LearningSvgIcon className={className} />;
    case 'reading':
      return <ReadingSvgIcon className={className} />;
    case 'culture':
      return <CultureSvgIcon className={className} />;
    case 'science':
      return <ScienceSvgIcon className={className} />;
    case 'kids':
      return <KidsSvgIcon className={className} />;
    case 'favorites':
      return <FavoritesSvgIcon className={className} />;
    case 'library':
      return <LibrarySvgIcon className={className} />;
    case 'flow-journey':
      return <FlowJourneySvgIcon className={className} />;
    case 'settings':
      return <SettingsSvgIcon className={className} />;
  }
}
