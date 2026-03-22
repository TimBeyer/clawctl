declare module "asciinema-player" {
  interface PlayerOptions {
    autoPlay?: boolean;
    preload?: boolean;
    loop?: boolean | number;
    startAt?: number | string;
    speed?: number;
    idleTimeLimit?: number;
    theme?: string;
    poster?: string;
    fit?: "width" | "height" | "both" | false;
    controls?: boolean | "auto";
    terminalFontSize?: string;
    terminalFontFamily?: string;
    terminalLineHeight?: number;
    cols?: number;
    rows?: number;
    markers?: (number | [number, string])[];
    pauseOnMarkers?: boolean;
    audioUrl?: string;
    logger?: Console;
  }

  type EventName = "play" | "playing" | "pause" | "ended" | "input" | "marker";

  interface Player {
    el: HTMLElement;
    play(): Promise<void>;
    pause(): void;
    getCurrentTime(): Promise<number>;
    getDuration(): Promise<number>;
    seek(location: number | string | { marker: number | "prev" | "next" }): Promise<void>;
    addEventListener(event: EventName, handler: () => void): void;
    dispose(): void;
  }

  export function create(src: string, elem: HTMLElement, opts?: PlayerOptions): Player;
}
