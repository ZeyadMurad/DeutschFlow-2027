import React from 'react';
import type { AppSectionId } from '../../types/media';

interface IconProps {
  className?: string;
}

export const RadioSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <path d="M13 15L35 7" stroke="#B68934" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="36" cy="7" r="2.2" fill="#D85A40" />
    <rect x="6" y="15" width="36" height="25" rx="5" fill="#F7F3EA" stroke="#0E4B4B" strokeWidth="2.2" />
    <circle cx="17" cy="28" r="6.5" fill="#0E4B4B" fillOpacity="0.1" stroke="#0E4B4B" strokeWidth="2" />
    <circle cx="17" cy="28" r="2.2" fill="#0E4B4B" />
    <rect x="27" y="21" width="10" height="5" rx="1.5" fill="#D85A40" fillOpacity="0.2" stroke="#D85A40" strokeWidth="1.6" />
    <line x1="27" y1="30.5" x2="37" y2="30.5" stroke="#0E4B4B" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="27" y1="34.5" x2="37" y2="34.5" stroke="#0E4B4B" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const NewsSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <circle cx="24" cy="24" r="16" fill="#F7F3EA" stroke="#0E4B4B" strokeWidth="2.2" />
    <ellipse cx="24" cy="24" rx="7.5" ry="16" stroke="#0E4B4B" strokeWidth="1.8" />
    <line x1="8.5" y1="19" x2="39.5" y2="19" stroke="#0E4B4B" strokeWidth="1.8" />
    <line x1="8.5" y1="29" x2="39.5" y2="29" stroke="#0E4B4B" strokeWidth="1.8" />
    <path d="M33 10C37.5 13 40 18 40 24" stroke="#D85A40" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="36" cy="12" r="3" fill="#D85A40" />
  </svg>
);

export const NewspaperSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <path d="M8 10C8 8.34 9.34 7 11 7H33C34.66 7 36 8.34 36 10V37C36 39.21 34.21 41 32 41H12C9.79 41 8 39.21 8 37V10Z" fill="#F7F3EA" stroke="#0E4B4B" strokeWidth="2.2" />
    <path d="M36 16H40C41.1 16 42 16.9 42 18V36C42 38.76 39.76 41 37 41H32" stroke="#0E4B4B" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="13" y="12" width="18" height="7" rx="1.5" fill="#B68934" fillOpacity="0.24" stroke="#B68934" strokeWidth="1.7" />
    <line x1="13" y1="24" x2="31" y2="24" stroke="#0E4B4B" strokeWidth="2" strokeLinecap="round" />
    <line x1="13" y1="29" x2="31" y2="29" stroke="#0E4B4B" strokeWidth="2" strokeLinecap="round" />
    <line x1="13" y1="34" x2="24" y2="34" stroke="#D85A40" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const YouTubeSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <rect x="6" y="10" width="36" height="26" rx="6" fill="#F7F3EA" stroke="#0E4B4B" strokeWidth="2.2" />
    <path d="M20.5 18L30.5 23L20.5 28V18Z" fill="#D85A40" stroke="#D85A40" strokeWidth="1.6" strokeLinejoin="round" />
    <line x1="16" y1="41" x2="32" y2="41" stroke="#0E4B4B" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="24" y1="36" x2="24" y2="41" stroke="#0E4B4B" strokeWidth="2.2" />
  </svg>
);

export const DocumentarySvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <circle cx="15" cy="14" r="5" fill="#B68934" fillOpacity="0.25" stroke="#0E4B4B" strokeWidth="2" />
    <circle cx="27" cy="13" r="6" fill="#B68934" fillOpacity="0.25" stroke="#0E4B4B" strokeWidth="2" />
    <rect x="7" y="20" width="25" height="19" rx="4" fill="#F7F3EA" stroke="#0E4B4B" strokeWidth="2.2" />
    <path d="M32 25L41 20.5V38.5L32 34V25Z" fill="#D85A40" fillOpacity="0.2" stroke="#D85A40" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="19.5" cy="29.5" r="4" stroke="#0E4B4B" strokeWidth="1.8" />
  </svg>
);

export const PodcastSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <rect x="18" y="8" width="12" height="20" rx="6" fill="#B68934" fillOpacity="0.22" stroke="#0E4B4B" strokeWidth="2.2" />
    <line x1="21" y1="15" x2="27" y2="15" stroke="#D85A40" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="21" y1="20" x2="27" y2="20" stroke="#D85A40" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 23C12 29.63 17.37 35 24 35C30.63 35 36 29.63 36 23" stroke="#0E4B4B" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="24" y1="35" x2="24" y2="41" stroke="#0E4B4B" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="16" y1="41" x2="32" y2="41" stroke="#0E4B4B" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const MoviesSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <rect x="7" y="17" width="34" height="23" rx="3.5" fill="#F7F3EA" stroke="#0E4B4B" strokeWidth="2.2" />
    <path d="M7 17L40 9L41.5 14L8.5 22L7 17Z" fill="#D85A40" fillOpacity="0.22" stroke="#0E4B4B" strokeWidth="2" strokeLinejoin="round" />
    <line x1="15" y1="15" x2="18" y2="19.5" stroke="#0E4B4B" strokeWidth="2" />
    <line x1="24" y1="13" x2="27" y2="17.5" stroke="#0E4B4B" strokeWidth="2" />
    <line x1="33" y1="10.8" x2="36" y2="15.2" stroke="#0E4B4B" strokeWidth="2" />
    <path d="M21 24.5L29 29L21 33.5V24.5Z" fill="#0E4B4B" />
  </svg>
);

export const LearningSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <path d="M24 9L42 17L24 25L6 17L24 9Z" fill="#0E4B4B" fillOpacity="0.12" stroke="#0E4B4B" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M13 21V31C13 34.5 17.92 37.5 24 37.5C30.08 37.5 35 34.5 35 31V21" stroke="#0E4B4B" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="39" y1="18.5" x2="39" y2="32" stroke="#D85A40" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="39" cy="34" r="2.2" fill="#B68934" />
  </svg>
);

export const ReadingSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <path d="M24 13C19.5 10.2 13 9.5 7 11V37C13 35.5 19.5 36.2 24 39C28.5 36.2 35 35.5 41 37V11C35 9.5 28.5 10.2 24 13Z" fill="#F7F3EA" stroke="#0E4B4B" strokeWidth="2.2" strokeLinejoin="round" />
    <line x1="24" y1="13" x2="24" y2="39" stroke="#0E4B4B" strokeWidth="2" />
    <line x1="12" y1="18" x2="19" y2="18.8" stroke="#B68934" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="24" x2="19" y2="24.8" stroke="#0E4B4B" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="29" y1="18.8" x2="36" y2="18" stroke="#D85A40" strokeWidth="2" strokeLinecap="round" />
    <line x1="29" y1="24.8" x2="36" y2="24" stroke="#0E4B4B" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const CultureSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <path d="M8 17L24 8L40 17H8Z" fill="#B68934" fillOpacity="0.22" stroke="#0E4B4B" strokeWidth="2.2" strokeLinejoin="round" />
    <line x1="13" y1="17" x2="13" y2="35" stroke="#0E4B4B" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="20.5" y1="17" x2="20.5" y2="35" stroke="#0E4B4B" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="27.5" y1="17" x2="27.5" y2="35" stroke="#0E4B4B" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="35" y1="17" x2="35" y2="35" stroke="#0E4B4B" strokeWidth="2.4" strokeLinecap="round" />
    <rect x="7" y="35" width="34" height="5" rx="1.5" fill="#D85A40" fillOpacity="0.22" stroke="#0E4B4B" strokeWidth="2" />
  </svg>
);

export const ScienceSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <ellipse cx="24" cy="24" rx="16" ry="6.5" transform="rotate(30 24 24)" stroke="#0E4B4B" strokeWidth="2" />
    <ellipse cx="24" cy="24" rx="16" ry="6.5" transform="rotate(-30 24 24)" stroke="#0E4B4B" strokeWidth="2" />
    <ellipse cx="24" cy="24" rx="16" ry="6.5" transform="rotate(90 24 24)" stroke="#B68934" strokeWidth="1.9" />
    <circle cx="24" cy="24" r="3.8" fill="#D85A40" />
  </svg>
);

export const KidsSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <path d="M24 7L39 19L24 35L9 19L24 7Z" fill="#B68934" fillOpacity="0.22" stroke="#0E4B4B" strokeWidth="2.2" strokeLinejoin="round" />
    <line x1="24" y1="7" x2="24" y2="35" stroke="#0E4B4B" strokeWidth="1.8" />
    <line x1="9" y1="19" x2="39" y2="19" stroke="#D85A40" strokeWidth="1.8" />
    <path d="M24 35C24 39 28 41 32 41C35 41 37 39.5 38 38" stroke="#D85A40" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const FavoritesSvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <path
      d="M24 39C24 39 8 29.5 8 18.2C8 13.1 12 9 17 9C20.2 9 22.8 10.6 24 13C25.2 10.6 27.8 9 31 9C36 9 40 13.1 40 18.2C40 29.5 24 39 24 39Z"
      fill="#D85A40"
      fillOpacity="0.18"
      stroke="#0E4B4B"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <path d="M16.5 16C15 17 14 18.6 14 20.5" stroke="#D85A40" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const LibrarySvgIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => (
  <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
    <rect x="8" y="9" width="9" height="30" rx="2" fill="#0E4B4B" fillOpacity="0.12" stroke="#0E4B4B" strokeWidth="2.1" />
    <rect x="20" y="13" width="9" height="26" rx="2" fill="#B68934" fillOpacity="0.24" stroke="#0E4B4B" strokeWidth="2.1" />
    <path d="M31 11L39 9.5L42 38L34 39.5L31 11Z" fill="#D85A40" fillOpacity="0.18" stroke="#0E4B4B" strokeWidth="2.1" strokeLinejoin="round" />
    <line x1="6" y1="41" x2="43" y2="41" stroke="#0E4B4B" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const BrandCrestSvg: React.FC<IconProps> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
    <rect x="2" y="2" width="36" height="36" rx="10" fill="#0E4B4B" />
    <path d="M11 26C14 18 19 14 28 14" stroke="#B68934" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M11 21C14 15.5 18 12.5 24.5 12" stroke="#F7F3EA" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7" />
    <circle cx="28.5" cy="14" r="3" fill="#D85A40" />
    <circle cx="12.5" cy="26.5" r="2.2" fill="#F7F3EA" />
  </svg>
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
  }
}
