import { useState, useCallback } from "react";
import { AsciinemaTerminal } from "./AsciinemaTerminal";

interface Recording {
  /** URL path to the .cast file */
  src: string;
  /** Label shown in the segment indicator */
  label: string;
}

interface DemoSequenceProps {
  /** Ordered list of recordings to play in sequence */
  recordings: Recording[];
  /** Title shown in the terminal bar */
  title?: string;
  /** Playback speed multiplier (default: 1) */
  speed?: number;
  /** Cap idle pauses (seconds) */
  idleTimeLimit?: number;
}

export function DemoSequence({ recordings, title, speed = 1, idleTimeLimit }: DemoSequenceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleEnded = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < recordings.length - 1) return prev + 1;
      // Loop back to start
      return 0;
    });
  }, [recordings.length]);

  if (recordings.length === 0) return null;

  const current = recordings[currentIndex];

  return (
    <div className="demo-sequence">
      {/* Segment indicator */}
      {recordings.length > 1 && (
        <div className="flex items-center justify-center gap-3 mb-4">
          {recordings.map((rec, i) => (
            <button
              key={rec.src}
              onClick={() => setCurrentIndex(i)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono
                transition-all cursor-pointer
                ${
                  i === currentIndex
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "bg-white/5 text-slate-500 border border-transparent hover:text-slate-400 hover:bg-white/8"
                }
              `}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  i === currentIndex ? "bg-accent" : "bg-slate-600"
                }`}
              />
              {rec.label}
            </button>
          ))}
        </div>
      )}

      {/* Player — key forces remount when index changes */}
      <AsciinemaTerminal
        key={current.src}
        src={current.src}
        title={title}
        speed={speed}
        idleTimeLimit={idleTimeLimit}
        onEnded={handleEnded}
        autoPlay
      />
    </div>
  );
}
