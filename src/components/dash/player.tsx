import { useEffect, useState } from "react";

export type Cut = { id: string; title: string; artist: string; album: string; url: string; page: string; art: string };

type Snap = {
  track: Cut | null;
  queue: Cut[];
  index: number;
  paused: boolean;
  volume: number;
  muted: boolean;
  progress: number;
  duration: number;
  repeat: "off" | "all" | "one";
  shuffle: boolean;
};

const audio = typeof window !== "undefined" ? new Audio() : null;
if (audio) audio.preload = "auto";

function trackDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("lifeos.music", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("files")) request.result.createObjectStore("files");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function saveTrackFile(id: string, file: Blob) {
  return trackDb().then((base) => new Promise<void>((resolve, reject) => {
    const tx = base.transaction("files", "readwrite");
    tx.objectStore("files").put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

export function readTrackFile(url: string) {
  if (!url.startsWith("idb:")) return Promise.resolve(url);
  const id = url.slice(4);
  return trackDb().then((base) => new Promise<string>((resolve, reject) => {
    const request = base.transaction("files", "readonly").objectStore("files").get(id);
    request.onsuccess = () => {
      const blob = request.result as Blob | undefined;
      if (!blob) reject(new Error("missing"));
      else resolve(URL.createObjectURL(blob));
    };
    request.onerror = () => reject(request.error);
  }));
}

let snap: Snap = {
  track: null,
  queue: [],
  index: 0,
  paused: true,
  volume: 0.8,
  muted: false,
  progress: 0,
  duration: 0,
  repeat: "off",
  shuffle: false,
};

const ears = new Set<() => void>();
function poke() {
  ears.forEach((fn) => fn());
}

const blobs = new Map<string, string>();

function isFile(url: string) {
  if (!url) return false;
  if (url.startsWith("idb:") || url.startsWith("blob:") || url.startsWith("data:audio")) return true;
  if (/spotify\.com|spotify:|youtube\.com|youtu\.be/i.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

async function fileSrc(url: string) {
  if (!url.startsWith("idb:")) return url;
  const saved = blobs.get(url);
  if (saved) return saved;
  const src = await readTrackFile(url);
  blobs.set(url, src);
  return src;
}

async function previewFor(track: Cut) {
  const term = [track.artist, track.title].filter((part) => part && part !== "Local" && part !== "Music Einstein").join(" ").trim();
  if (!term) return "";
  const response = await fetch(`https://itunes.apple.com/search?entity=song&limit=1&term=${encodeURIComponent(term)}`);
  const body = await response.json() as { results?: { previewUrl?: string }[] };
  return body.results?.[0]?.previewUrl || "";
}

function arm(src: string, autoplay: boolean, track: Cut | null, backup = true) {
  if (!audio) return;
  audio.volume = snap.muted ? 0 : snap.volume;
  if (audio.src !== src) audio.src = src;
  if (!autoplay) {
    audio.pause();
    poke();
    return;
  }
  const owned = !!track && (track.url.startsWith("idb:") || track.url.startsWith("data:audio") || track.url.startsWith("blob:"));
  const fail = () => {
    if (!track || !backup || owned) {
      snap = { ...snap, paused: true };
      poke();
      return;
    }
    void previewFor(track).then((next) => {
      if (snap.track?.id !== track.id || !next || next === src) {
        snap = { ...snap, paused: true };
        poke();
        return;
      }
      arm(next, true, track, false);
    }).catch(() => { snap = { ...snap, paused: true }; poke(); });
  };
  audio.addEventListener("error", fail, { once: true });
  void audio.play().then(() => {
    audio.removeEventListener("error", fail);
    snap = { ...snap, paused: false };
    poke();
  }).catch(fail);
}

function load(track: Cut | null, autoplay: boolean) {
  snap = { ...snap, track, paused: !autoplay || !track, progress: 0, duration: 0 };
  poke();
  if (!audio || !track) return;
  const direct = track.url.startsWith("idb:") ? blobs.get(track.url) || "" : isFile(track.url) ? track.url : "";
  if (direct) {
    arm(direct, autoplay, track);
    return;
  }
  void (track.url.startsWith("idb:") ? fileSrc(track.url) : Promise.resolve("")).then(async (src) => {
    if (snap.track?.id !== track.id) return;
    let next = src;
    if (!next) {
      try { next = await previewFor(track); } catch { next = ""; }
    }
    if (snap.track?.id !== track.id) return;
    if (!next) {
      snap = { ...snap, paused: true };
      poke();
      return;
    }
    arm(next, autoplay, track, false);
  });
}

export function step(dir: number) {
  const queue = snap.queue;
  if (snap.repeat === "one" && dir > 0 && audio && snap.track?.url) {
    audio.currentTime = 0;
    snap = { ...snap, paused: false, progress: 0 };
    void audio.play().catch(() => { snap = { ...snap, paused: true }; poke(); });
    poke();
    return;
  }
  if (!queue.length) {
    stopCut();
    return;
  }
  let index = snap.index;
  if (snap.shuffle) index = Math.floor(Math.random() * queue.length);
  else {
    index += dir;
    if (index >= queue.length) index = snap.repeat === "all" ? 0 : snap.index;
    if (index < 0) index = queue.length - 1;
  }
  snap = { ...snap, index };
  load(queue[index] || null, true);
}

if (audio) {
  audio.addEventListener("timeupdate", () => {
    snap = { ...snap, progress: audio.currentTime };
    poke();
  });
  audio.addEventListener("loadedmetadata", () => {
    snap = { ...snap, duration: Number.isFinite(audio.duration) ? audio.duration : 0 };
    poke();
  });
  audio.addEventListener("ended", () => step(1));
}

export function usePlayer() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const hear = () => setTick((value) => value + 1);
    ears.add(hear);
    return () => { ears.delete(hear); };
  }, []);
  return snap;
}

export function playCut(track: Cut, queue: Cut[] = [track]) {
  const index = Math.max(0, queue.findIndex((row) => row.id === track.id));
  snap = { ...snap, queue: queue.length ? queue : [track], index };
  load(track, true);
}

export function togglePause() {
  if (!snap.track) return;
  if (!audio) {
    snap = { ...snap, paused: !snap.paused };
    poke();
    return;
  }
  const bare = !audio.getAttribute("src") || /spotify\.com|youtube\.com|youtu\.be/i.test(audio.currentSrc);
  if (snap.paused || bare) {
    if (bare) {
      load(snap.track, true);
      return;
    }
    snap = { ...snap, paused: false };
    void audio.play().catch(() => { snap = { ...snap, paused: true }; poke(); });
  } else {
    audio.pause();
    snap = { ...snap, paused: true };
  }
  poke();
}

export function stopCut() {
  audio?.pause();
  if (audio) {
    audio.currentTime = 0;
    audio.removeAttribute("src");
  }
  snap = { ...snap, track: null, paused: true, progress: 0, duration: 0 };
  poke();
}

export function seekTo(time: number) {
  if (audio && snap.track?.url) audio.currentTime = time;
  snap = { ...snap, progress: time };
  poke();
}

export function setPlayerVolume(volume: number) {
  snap = { ...snap, volume, muted: false };
  if (audio) audio.volume = volume;
  poke();
}

export function setPlayerMuted(muted: boolean) {
  snap = { ...snap, muted };
  if (audio) audio.volume = muted ? 0 : snap.volume;
  poke();
}

export function setPlayerRepeat(repeat: Snap["repeat"]) {
  snap = { ...snap, repeat };
  poke();
}

export function setPlayerShuffle(shuffle: boolean) {
  snap = { ...snap, shuffle };
  poke();
}
