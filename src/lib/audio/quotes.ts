import { useCallback, useEffect, useRef, useState } from 'react';
import { LEAD_IN, TAIL } from './player';

/**
 * Plays quotes from different recordings with one audio element, for pages that list items from many calls.
 * Each ▶ loads that recording (the server answers byte ranges), plays the quoted words with a little
 * lead-in and stops at their end. Pressing the same ▶ again pauses.
 */
export function useQuotePlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const stopAt = useRef(Infinity);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  const play = useCallback(
    (key: string, url: string, start: number, end: number) => {
      let el = audio.current;
      if (!el) {
        const created = new Audio();
        created.preload = 'none';
        created.addEventListener('timeupdate', () => {
          if (created.currentTime >= stopAt.current) created.pause();
        });
        created.addEventListener('pause', () => setPlaying(null));
        created.addEventListener('ended', () => setPlaying(null));
        audio.current = el = created;
      }
      const player = el;
      if (playing === key && !player.paused) {
        player.pause();
        return;
      }
      stopAt.current = end + TAIL;
      const begin = () => {
        player.currentTime = Math.max(0, start - LEAD_IN);
        player
          .play()
          .then(() => setPlaying(key))
          .catch(() => setPlaying(null));
      };
      setPlaying(key);
      if (player.src !== new URL(url, window.location.href).href) {
        player.src = url;
        player.addEventListener('loadedmetadata', begin, { once: true });
        player.load();
      } else {
        begin();
      }
    },
    [playing],
  );

  return { playing, play };
}
