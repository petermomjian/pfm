import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

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
