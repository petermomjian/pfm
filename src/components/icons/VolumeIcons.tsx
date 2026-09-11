import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function VolumeIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M10.3601 5.63997C10.985 6.26507 11.336 7.11276 11.336 7.99664C11.336 8.88052 10.985 9.72821 10.3601 10.3533M12.7133 3.28662C13.9631 4.53681 14.6652 6.23219 14.6652 7.99995C14.6652 9.76772 13.9631 11.4631 12.7133 12.7133M7.33337 3.33333L4.00004 6H1.33337V10H4.00004L7.33337 12.6667V3.33333Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VolumeLowIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M10.3601 5.63998C10.985 6.26507 11.336 7.11276 11.336 7.99664C11.336 8.88052 10.985 9.72822 10.3601 10.3533M7.33337 3.33334L4.00004 6H1.33337V10H4.00004L7.33337 12.6667V3.33334Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VolumeMinIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M7.33337 3.33333L4.00004 5.99999H1.33337V9.99999H4.00004L7.33337 12.6667V3.33333Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MuteIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M14.6667 6L10.6667 10M10.6667 6L14.6667 10M7.3334 3.3333L4 6H1.33337V10H4L7.3334 12.6667V3.3333Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
