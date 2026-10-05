import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/** Quotes play a little before and after the quoted words, so they don't sound clipped. */
export const LEAD_IN = 0.25;
export const TAIL = 0.35;

export type Segment = { id: string; start: number; end: number };

type Player = {
  ready: boolean;
  playing: boolean;
  time: number;
  duration: number;
  rate: number;
  segment: Segment | null;
  /** Plays one quote and stops at its end. Calling it again for the same quote pauses. */
  playSegment: (id: string, start: number, end: number) => void;
  toggle: () => void;
  seek: (time: number) => void;
  skip: (delta: number) => void;
  setRate: (rate: number) => void;
};

const PlayerContext = createContext<Player | null>(null);

export function PlayerProvider({ url, duration, children }: { url: string | null; duration: number; children: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const segmentRef = useRef<Segment | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [rate, setRateState] = useState(1);
  const [segment, setSegment] = useState<Segment | null>(null);

  useEffect(() => {
    if (!url) return;
    const a = new Audio(url);
    a.preload = 'auto';
    audio.current = a;
    const onPlay = () => setPlaying(true);
    const onStop = () => {
      segmentRef.current = null;
      setSegment(null);
      setPlaying(false);
      setTime(a.currentTime);
    };
    const onReady = () => setReady(true);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onStop);
    a.addEventListener('ended', onStop);
    a.addEventListener('canplay', onReady);
    return () => {
      a.pause();
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onStop);
      a.removeEventListener('ended', onStop);
      a.removeEventListener('canplay', onReady);
      audio.current = null;
      setReady(false);
    };
  }, [url]);

  // Smooth time while playing; stop at the end of a quoted segment.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const a = audio.current;
      if (!a) return;
      const current = segmentRef.current;
      if (current && a.currentTime >= current.end) {
        a.pause();
        return;
      }
      setTime(a.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const playSegment = useCallback((id: string, start: number, end: number) => {
    const a = audio.current;
    if (!a) return;
    if (segmentRef.current?.id === id && !a.paused) {
      a.pause();
      return;
    }
    const next = { id, start: Math.max(0, start - LEAD_IN), end: end + TAIL };
    segmentRef.current = next;
    setSegment(next);
    a.currentTime = next.start;
    setTime(next.start);
    void a.play();
  }, []);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    segmentRef.current = null;
    setSegment(null);
    if (a.paused) void a.play();
    else a.pause();
  }, []);

  const seek = useCallback((to: number) => {
    const a = audio.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(to, a.duration || to));
    setTime(a.currentTime);
  }, []);

  const skip = useCallback((delta: number) => {
    const a = audio.current;
    if (a) seek(a.currentTime + delta);
  }, [seek]);

  const setRate = useCallback((next: number) => {
    if (audio.current) audio.current.playbackRate = next;
    setRateState(next);
  }, []);

  const value = useMemo<Player>(
    () => ({ ready, playing, time, duration, rate, segment, playSegment, toggle, seek, skip, setRate }),
    [ready, playing, time, duration, rate, segment, playSegment, toggle, seek, skip, setRate],
  );
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): Player {
  const player = useContext(PlayerContext);
  if (!player) throw new Error('usePlayer needs a PlayerProvider.');
  return player;
}
