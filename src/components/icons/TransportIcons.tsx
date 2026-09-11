import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function SkipBackIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M5 19V5M19 20L9 12L19 4V20Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SkipForwardIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M19 5V19M5 4L15 12L5 20V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M6 3L20 12L6 21V3Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PauseIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M15.2 5.33333C15.2 4.97971 15.3475 4.64057 15.6101 4.39052C15.8726 4.14048 16.2287 4 16.6 4C16.9713 4 17.3274 4.14048 17.59 4.39052C17.8525 4.64057 18 4.97971 18 5.33333V18.6667C18 19.0203 17.8525 19.3594 17.59 19.6095C17.3274 19.8595 16.9713 20 16.6 20C16.2287 20 15.8726 19.8595 15.6101 19.6095C15.3475 19.3594 15.2 19.0203 15.2 18.6667V5.33333ZM6 5.33333C6 4.97971 6.1475 4.64057 6.41005 4.39052C6.6726 4.14048 7.0287 4 7.4 4C7.7713 4 8.1274 4.14048 8.38995 4.39052C8.6525 4.64057 8.8 4.97971 8.8 5.33333V18.6667C8.8 19.0203 8.6525 19.3594 8.38995 19.6095C8.1274 19.8595 7.7713 20 7.4 20C7.0287 20 6.6726 19.8595 6.41005 19.6095C6.1475 19.3594 6 19.0203 6 18.6667V5.33333Z"
        fill="currentColor"
      />
    </svg>
  );
}
