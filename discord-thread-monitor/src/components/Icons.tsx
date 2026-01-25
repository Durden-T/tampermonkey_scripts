import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

interface ChevronIconProps extends IconProps {
  expanded?: boolean;
}

const STROKE_WIDTH = 2;

export const ScanIcon = React.memo(({ size = 16, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    <path d="M21 3v5h-5" />
  </svg>
));
ScanIcon.displayName = 'ScanIcon';

export const CloseIcon = React.memo(({ size = 16, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </svg>
));
CloseIcon.displayName = 'CloseIcon';

export const UpdateIcon = React.memo(({ size = 16, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
));
UpdateIcon.displayName = 'UpdateIcon';

export const ChevronIcon = React.memo(
  ({ expanded = false, size = 14, className }: ChevronIconProps) => (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
);
ChevronIcon.displayName = 'ChevronIcon';

export const HelpIcon = React.memo(({ size = 16, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
));
HelpIcon.displayName = 'HelpIcon';

export const ThreadIcon = React.memo(({ size = 20, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 12h4" />
    <path d="M10 16h2" />
  </svg>
));
ThreadIcon.displayName = 'ThreadIcon';

export const EyeIcon = React.memo(({ size = 16, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
));
EyeIcon.displayName = 'EyeIcon';

export const BlockIcon = React.memo(({ size = 16, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m4.9 4.9 14.2 14.2" />
  </svg>
));
BlockIcon.displayName = 'BlockIcon';

export const CheckIcon = React.memo(({ size = 16, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
));
CheckIcon.displayName = 'CheckIcon';

export const TrashIcon = React.memo(({ size = 16, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
));
TrashIcon.displayName = 'TrashIcon';

export const ExternalLinkIcon = React.memo(({ size = 16, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
));
ExternalLinkIcon.displayName = 'ExternalLinkIcon';

export const ResumeIcon = React.memo(({ size = 16, className }: IconProps) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
));
ResumeIcon.displayName = 'ResumeIcon';
