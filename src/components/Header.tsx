import { SITE_NAME } from "@/config";
import { Logo } from "@/components/icons/Logo";

export function Header() {
  return (
    <div className="flex w-full items-center justify-between pointer-events-auto">
      <Logo height={32} role="img" aria-label={SITE_NAME} />
    </div>
  );
}
