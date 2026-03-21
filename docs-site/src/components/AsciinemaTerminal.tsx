import { useEffect, useRef, useState } from "react";
import "asciinema-player/dist/bundle/asciinema-player.css";

// asciinema-player doesn't ship types — use the JS API directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Player = any;

interface AsciinemaTerminalProps {
  /** URL path to the .cast file (e.g. "/clawctl/casts/create.cast") */
  src: string;
  /** Title shown in the terminal bar */
  title?: string;
  /** Start playback when scrolled into view (default: true) */
  autoPlay?: boolean;
  /** Loop playback (default: false) */
  loop?: boolean;
  /** Playback speed multiplier (default: 1) */
  speed?: number;
  /** Cap idle pauses to this many seconds */
  idleTimeLimit?: number;
  /** Frame to show before playback, e.g. "npt:0:3" */
  poster?: string;
  /** Terminal fit mode (default: "width") */
  fit?: "width" | "height" | "both" | false;
  /** Callback when playback ends */
  onEnded?: () => void;
}

export function AsciinemaTerminal({
  src,
  title,
  autoPlay = true,
  loop = false,
  speed = 1,
  idleTimeLimit,
  poster,
  fit = "width",
  onEnded,
}: AsciinemaTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player>(null);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);

  // Detect when the component scrolls into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Create the player once the container is ready
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;

    // Dynamic import since asciinema-player is ESM with side effects
    import("asciinema-player").then((AsciinemaPlayer) => {
      // Guard against StrictMode double-mount: if cleanup already ran
      // before this async import resolved, don't create the player.
      if (disposed) return;

      const player = AsciinemaPlayer.create(src, el, {
        autoPlay: false, // We manage autoplay via IntersectionObserver
        loop,
        speed,
        idleTimeLimit,
        poster,
        fit,
        theme: "asciinema",
        terminalFontFamily:
          "'JetBrains Mono', ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace",
      });

      playerRef.current = player;

      if (onEnded) {
        player.addEventListener("ended", onEnded);
      }
    });

    return () => {
      disposed = true;
      playerRef.current?.dispose();
      playerRef.current = null;
    };
    // Only re-create when src changes — other props are set at creation time
  }, [src]);

  // Auto-play when scrolled into view
  useEffect(() => {
    if (visible && autoPlay && !started && playerRef.current) {
      playerRef.current.play();
      setStarted(true);
    }
  }, [visible, autoPlay, started]);

  return (
    <div className="asciinema-terminal terminal">
      <div className="terminal-bar flex items-center justify-between">
        <div className="flex items-center gap-[6px]">
          <span className="terminal-dot bg-[#ff5f57]" />
          <span className="terminal-dot bg-[#febc2e]" />
          <span className="terminal-dot bg-[#28c840]" />
          {title && (
            <span className="ml-2 text-xs text-slate-500 font-mono select-none">{title}</span>
          )}
        </div>
      </div>
      <div ref={containerRef} className="asciinema-terminal-body" />
    </div>
  );
}
