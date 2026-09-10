import { SITE_NAME } from "@/config";

export function Header() {
  return (
    <div className="flex w-full items-center justify-between pointer-events-auto">
      <div className="text-sm">{SITE_NAME}</div>
    </div>
  );
}
