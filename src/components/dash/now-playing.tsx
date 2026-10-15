import { useMemo } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from "lucide-react";
import { seekTo, setPlayerMuted, setPlayerVolume, step, stopCut, togglePause, usePlayer } from "./player";

const BARS = 48;

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function NowPlaying() {
  const playing = usePlayer();
  const track = playing.track;
  const bars = useMemo(() => {
    const seed = track?.id || "none";
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    const out: number[] = [];
    for (let i = 0; i < BARS; i += 1) {
      hash = (hash * 1103515245 + 12345) | 0;
      out.push(0.25 + (Math.abs(hash % 1000) / 1000) * 0.75);
    }
    return out;
  }, [track?.id]);
  if (!track) return null;
  const ratio = playing.duration > 0 ? Math.min(1, playing.progress / playing.duration) : 0;
  const played = Math.floor(ratio * BARS);
  const volume = playing.muted ? 0 : playing.volume;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 px-3 py-2 backdrop-blur" data-sound="off">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        {track.art ? <img src={track.art} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/10 text-white/40">♪</span>}
        <div className="w-36 shrink-0 sm:w-48">
          <p className="truncate text-sm">{track.title}</p>
          <p className="truncate text-[11px] text-white/40">{track.artist || "—"}</p>
        </div>
        <button type="button" className="grid h-8 w-8 place-items-center text-white/60 hover:text-white" aria-label="Previous" onClick={() => step(-1)}><SkipBack size={15} /></button>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white" aria-label={playing.paused ? "Play" : "Pause"} onClick={togglePause}>{playing.paused ? <Play size={16} /> : <Pause size={16} />}</button>
        <button type="button" className="grid h-8 w-8 place-items-center text-white/60 hover:text-white" aria-label="Next" onClick={() => step(1)}><SkipForward size={15} /></button>
        <span className="hidden w-9 text-[10px] tabular-nums text-white/40 sm:block">{clock(playing.progress)}</span>
        <button
          type="button"
          className="flex h-8 min-w-0 flex-1 items-center gap-[2px]"
          aria-label="Seek"
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const next = (event.clientX - box.left) / box.width;
            if (playing.duration > 0) seekTo(Math.max(0, Math.min(playing.duration, next * playing.duration)));
          }}
        >
          {bars.map((height, index) => (
            <span key={index} className="block min-w-0 flex-1 rounded-full" style={{ height: `${height * 100}%`, background: index < played ? "rgb(96 165 250)" : "rgb(255 255 255 / 0.12)" }} />
          ))}
        </button>
        <span className="hidden w-9 text-[10px] tabular-nums text-white/40 sm:block">{clock(playing.duration)}</span>
        <button type="button" className="grid h-8 w-8 place-items-center text-white/50" aria-label="Mute" onClick={() => setPlayerMuted(!playing.muted)}><VolumeIcon size={14} /></button>
        <input className="hidden w-24 sm:block" type="range" min={0} max={1} step={0.01} value={volume} aria-label="Volume" onChange={(event) => setPlayerVolume(Number(event.target.value))} />
        <button type="button" className="link-remove" onClick={stopCut}>Stop</button>
      </div>
      {!track.url && track.page.includes("open.spotify.com/") ? (
        <iframe title={track.title} className="mx-auto mt-2 h-20 w-full max-w-5xl rounded-xl" src={`${track.page.replace("open.spotify.com/", "open.spotify.com/embed/")}?autoplay=1`} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
      ) : null}
    </div>
  );
}
