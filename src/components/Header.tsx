import { SITE_NAME } from "@/config";
import { Logo } from "@/components/icons/Logo";
import { VinylMark } from "@/components/VinylMark";
import { usePlayer } from "@/player/PlayerContext";

export function Header() {
  const { track, isAudioPlaying } = usePlayer();

  return (
    <div className="flex w-full items-center justify-between pointer-events-auto">
      <Logo height={32} role="img" aria-label={SITE_NAME} />

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end justify-center gap-0.5 text-sm w-28 min-w-0 shrink-0">
          {track ? (
            <>
              <span className="text-muted">Now Playing</span>
              <span className="truncate w-full text-right">{track.title}</span>
            </>
          ) : (
            <span className="text-muted">Nothing Playing</span>
          )}
        </div>
        <VinylMark size={80} spinning={isAudioPlaying} flat={!track} />
      </div>
    </div>
  );
}
