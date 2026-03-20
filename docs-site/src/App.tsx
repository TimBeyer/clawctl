import { useEffect, useRef, useState, type ReactNode } from "react";
import "./App.css";
import { AsciinemaTerminal } from "./components/AsciinemaTerminal";
import { DemoSequence } from "./components/DemoSequence";

// Base path for .cast files served from public/casts/
const CAST_BASE = import.meta.env.BASE_URL + "casts";

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Terminal({
  children,
  title,
  copyText,
}: {
  children: ReactNode;
  title?: string;
  copyText?: string;
}) {
  return (
    <div className="terminal">
      <div className="terminal-bar flex items-center justify-between">
        <div className="flex items-center gap-[6px]">
          <span className="terminal-dot bg-[#ff5f57]" />
          <span className="terminal-dot bg-[#febc2e]" />
          <span className="terminal-dot bg-[#28c840]" />
          {title && (
            <span className="ml-2 text-xs text-slate-500 font-mono select-none">{title}</span>
          )}
        </div>
        {copyText && <CopyButton text={copyText} />}
      </div>
      <div className="terminal-body">{children}</div>
    </div>
  );
}

function Prompt() {
  return <span className="text-accent select-none">$ </span>;
}

function Cursor() {
  return (
    <span className="cursor-blink inline-block w-[7px] h-[15px] bg-accent/80 align-text-bottom ml-px translate-y-[1px]" />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all cursor-pointer"
      title="Copy to clipboard"
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function CreateDemo() {
  const castSrc = `${CAST_BASE}/create.cast`;
  const [hasCast, setHasCast] = useState(false);

  useEffect(() => {
    fetch(castSrc, { method: "HEAD" })
      .then((r) => setHasCast(r.ok))
      .catch(() => setHasCast(false));
  }, [castSrc]);

  if (!hasCast) return null;

  return (
    <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
      <FadeIn>
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
            See it in action
          </h2>
          <p className="mt-3 text-slate-400 text-lg max-w-xl mx-auto">
            The interactive wizard walks you through every setting. One command, fully configured
            gateway.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={80}>
        <AsciinemaTerminal src={castSrc} title="~ — clawctl create" idleTimeLimit={3} speed={1.5} />
      </FadeIn>
    </section>
  );
}

function Divider() {
  return (
    <div className="max-w-xs mx-auto h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
  );
}

function Nav() {
  return (
    <div className="nav-sticky">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="font-display font-bold text-lg tracking-tight text-white select-none">
          clawctl
        </span>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/TimBeyer/clawctl#readme"
            className="text-sm text-slate-400 hover:text-accent transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
          <a
            href="https://github.com/TimBeyer/clawctl"
            className="text-sm text-slate-300 hover:text-white transition-colors inline-flex items-center gap-1.5"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </nav>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative z-10 max-w-4xl mx-auto px-6 pt-20 md:pt-28 pb-20 text-center">
      <FadeIn>
        <h1 className="font-display font-extrabold text-[clamp(2.5rem,7vw,5rem)] leading-[1.05] tracking-tight text-white">
          AI agents,
          <br />
          <span className="text-accent">safely contained.</span>
        </h1>
      </FadeIn>

      <FadeIn delay={80}>
        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          clawctl runs each{" "}
          <a
            href="https://docs.openclaw.ai/"
            className="text-slate-300 underline decoration-slate-600 underline-offset-2 hover:decoration-accent/50 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenClaw
          </a>{" "}
          gateway in its own isolated Ubuntu VM. Set up in minutes. Manage a fleet from your
          terminal.
        </p>
      </FadeIn>

      <FadeIn delay={160}>
        <div className="mt-12 max-w-4xl mx-auto text-left">
          <Terminal
            title="~"
            copyText="curl -fsSL https://raw.githubusercontent.com/TimBeyer/clawctl/main/install.sh | bash"
          >
            <div className="text-slate-300">
              <Prompt />
              <span className="text-slate-200">
                curl -fsSL https://raw.githubusercontent.com/TimBeyer/clawctl/main/install.sh | bash
              </span>
            </div>
            <div className="text-slate-300 mt-1">
              <Prompt />
              <span className="text-slate-200">clawctl create</span>
              <Cursor />
            </div>
          </Terminal>
        </div>
        <p className="mt-5 text-sm text-slate-500">Requires macOS on Apple Silicon.</p>
      </FadeIn>
    </section>
  );
}

function FleetDemo() {
  const castSrc = `${CAST_BASE}/list.cast`;
  const [hasCast, setHasCast] = useState(false);

  useEffect(() => {
    fetch(castSrc, { method: "HEAD" })
      .then((r) => setHasCast(r.ok))
      .catch(() => setHasCast(false));
  }, [castSrc]);

  return (
    <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
      <FadeIn>
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
            Your fleet, at a glance
          </h2>
          <p className="mt-3 text-slate-400 text-lg max-w-xl mx-auto">
            Every instance is its own isolated VM. See them all with one command.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={80}>
        {hasCast ? (
          <AsciinemaTerminal src={castSrc} title="~ — clawctl list" idleTimeLimit={2} speed={1.5} />
        ) : (
          <Terminal title="~ — clawctl list">
            <div className="whitespace-pre text-slate-400">
              <Prompt />
              <span className="text-slate-200">clawctl list</span>
            </div>
            <div className="whitespace-pre mt-3">
              <div className="text-slate-500">
                {"NAME           STATUS   PROJECT                       PROVIDER   PORT"}
              </div>
              <div className="text-slate-300">
                {"research-ai    "}
                <span className="text-green">Running</span>
                {"  ~/openclaw-vms/research-ai    anthropic  18789"}
              </div>
              <div className="text-slate-300">
                {"code-review    "}
                <span className="text-green">Running</span>
                {"  ~/openclaw-vms/code-review    openai     18790"}
              </div>
              <div className="text-slate-300">
                {"data-pipeline  "}
                <span className="text-red">Stopped</span>
                {"  ~/openclaw-vms/data-pipeline  anthropic  18791"}
              </div>
            </div>
          </Terminal>
        )}
      </FadeIn>
    </section>
  );
}

function Features() {
  const features = [
    {
      label: "clawctl create",
      title: "Sandboxed by default",
      description:
        "Every gateway runs in its own Ubuntu VM via Lima. Nothing touches your Mac. Config and data live in a git-tracked project directory on your host — delete the VM, recreate it, pick up right where you left off.",
    },
    {
      label: "clawctl list",
      title: "Fleet-ready from day one",
      description:
        "Spin up as many gateways as your hardware allows. Each gets its own isolated VM, project directory, and config. Instance context resolution means you set the name once and stop repeating yourself.",
    },
    {
      label: "--config config.json",
      title: "Config-as-code",
      description:
        "Headless mode provisions from JSON configs — CI/CD, team onboarding, reproducible rebuilds. Reference 1Password secrets with op:// URIs. Zero plaintext credentials in your repo.",
    },
  ];

  return (
    <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
      <div className="grid md:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <FadeIn key={f.title} delay={i * 80}>
            <div className="feature-card h-full">
              <span className="inline-block font-mono text-xs text-accent/60 bg-accent-muted px-2.5 py-1 rounded mb-5 select-none">
                {f.label}
              </span>
              <h3 className="font-display font-bold text-xl text-white mb-3 tracking-tight">
                {f.title}
              </h3>
              <p className="text-slate-400 text-[15px] leading-relaxed">{f.description}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function ConfigSection() {
  const headlessCast = `${CAST_BASE}/headless.cast`;
  const [hasCast, setHasCast] = useState(false);

  useEffect(() => {
    fetch(headlessCast, { method: "HEAD" })
      .then((r) => setHasCast(r.ok))
      .catch(() => setHasCast(false));
  }, [headlessCast]);

  const configJson = `{
  "name": "hal",
  "project": "~/openclaw-vms/hal",
  "resources": { "cpus": 4, "memory": "8GiB" },
  "provider": {
    "type": "anthropic",
    "model": "anthropic/claude-opus-4-6"
  },
  "bootstrap": {
    "agent": {
      "name": "Hal",
      "context": "Calm, precise, just a little too helpful."
    }
  }
}`;

  return (
    <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
      <div className="grid md:grid-cols-2 gap-10 items-start">
        <FadeIn>
          <div className="md:sticky md:top-20">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
              Headless provisioning
            </h2>
            <p className="mt-4 text-slate-400 text-lg leading-relaxed">
              One JSON file. Full gateway. No prompts. VM resources, networking, provider, agent
              persona, channels — everything in one config you can check into git.
            </p>
            <div className="mt-6 space-y-3 text-[15px]">
              <div className="flex items-start gap-3">
                <span className="text-accent mt-0.5 shrink-0 font-mono text-sm">//</span>
                <span className="text-slate-400">
                  Share configs across your team for identical environments
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent mt-0.5 shrink-0 font-mono text-sm">//</span>
                <span className="text-slate-400">
                  Run in CI/CD for fully automated provisioning
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent mt-0.5 shrink-0 font-mono text-sm">//</span>
                <span className="text-slate-400">
                  Same config rebuilds an identical gateway every time
                </span>
              </div>
            </div>

            <div className="mt-8">
              {hasCast ? (
                <AsciinemaTerminal src={headlessCast} title="~" idleTimeLimit={2} speed={1.5} />
              ) : (
                <Terminal title="~">
                  <div className="text-slate-300">
                    <Prompt />
                    <span className="text-slate-200">clawctl create --config hal.json</span>
                  </div>
                </Terminal>
              )}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <Terminal title="hal.json">
            <pre className="whitespace-pre text-[12px] md:text-[13px] leading-relaxed">
              <JsonHighlight json={configJson} />
            </pre>
          </Terminal>
        </FadeIn>
      </div>
    </section>
  );
}

function JsonHighlight({ json }: { json: string }) {
  // Simple JSON syntax highlighter
  const lines = json.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {highlightJsonLine(line)}
          {"\n"}
        </span>
      ))}
    </>
  );
}

function highlightJsonLine(line: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = line;
  let key = 0;

  // Match leading whitespace
  const leadingMatch = remaining.match(/^(\s*)/);
  const indent = leadingMatch ? leadingMatch[1] : "";
  if (indent) {
    parts.push(indent);
    remaining = remaining.slice(indent.length);
  }

  // Tokenize the rest
  while (remaining.length > 0) {
    // Key-value pair: "key": value
    const kvMatch = remaining.match(/^("(?:[^"\\]|\\.)*")\s*:\s*(.*)/);
    if (kvMatch) {
      parts.push(
        <span key={key++} className="text-accent">
          {kvMatch[1]}
        </span>,
      );
      parts.push(
        <span key={key++} className="text-slate-500">
          {": "}
        </span>,
      );
      remaining = kvMatch[2];
      continue;
    }

    // String value
    const strMatch = remaining.match(/^("(?:[^"\\]|\\.)*")(.*)/);
    if (strMatch) {
      parts.push(
        <span key={key++} className="text-green">
          {strMatch[1]}
        </span>,
      );
      remaining = strMatch[2];
      continue;
    }

    // Number
    const numMatch = remaining.match(/^(\d+)(.*)/);
    if (numMatch) {
      parts.push(
        <span key={key++} className="text-cyan">
          {numMatch[1]}
        </span>,
      );
      remaining = numMatch[2];
      continue;
    }

    // Boolean
    const boolMatch = remaining.match(/^(true|false)(.*)/);
    if (boolMatch) {
      parts.push(
        <span key={key++} className="text-cyan">
          {boolMatch[1]}
        </span>,
      );
      remaining = boolMatch[2];
      continue;
    }

    // Brackets, commas, colons — punctuation
    const punctMatch = remaining.match(/^([{}[\],:])(.*)/);
    if (punctMatch) {
      parts.push(
        <span key={key++} className="text-slate-500">
          {punctMatch[1]}
        </span>,
      );
      remaining = punctMatch[2];
      continue;
    }

    // Whitespace
    const wsMatch = remaining.match(/^(\s+)(.*)/);
    if (wsMatch) {
      parts.push(wsMatch[1]);
      remaining = wsMatch[2];
      continue;
    }

    // Fallback — consume one character
    parts.push(remaining[0]);
    remaining = remaining.slice(1);
  }

  return <>{parts}</>;
}

function ManagementDemo() {
  const managementCast = `${CAST_BASE}/management.cast`;
  const [hasCast, setHasCast] = useState(false);

  useEffect(() => {
    fetch(managementCast, { method: "HEAD" })
      .then((r) => setHasCast(r.ok))
      .catch(() => setHasCast(false));
  }, [managementCast]);

  return (
    <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
      <FadeIn>
        <div className="text-center mb-10">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
            Not just an installer
          </h2>
          <p className="mt-3 text-slate-400 text-lg max-w-xl mx-auto">
            Day-to-day management from your host. No need to shell in.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={80}>
        {hasCast ? (
          <div className="max-w-2xl mx-auto">
            <DemoSequence
              recordings={[{ src: managementCast, label: "manage" }]}
              title="~"
              idleTimeLimit={2}
              speed={1.5}
            />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Terminal title="~">
              <div
                className="grid text-slate-300 gap-y-1"
                style={{ gridTemplateColumns: "auto 1fr" }}
              >
                {[
                  ["clawctl use research-ai", "set default instance"],
                  ["clawctl oc doctor", "health check"],
                  ["clawctl restart", "fix what's stuck"],
                  ["clawctl create", "spin up another"],
                  ["clawctl delete staging", "clean up"],
                ].map(([cmd, comment]) => (
                  <div key={cmd} className="grid grid-cols-subgrid col-span-2">
                    <span className="whitespace-nowrap">
                      <Prompt />
                      <span className="text-slate-200">{cmd}</span>
                    </span>
                    <span className="text-slate-600 whitespace-nowrap pl-8"># {comment}</span>
                  </div>
                ))}
              </div>
            </Terminal>
          </div>
        )}
      </FadeIn>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-28 text-center">
      <FadeIn>
        <h2 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight">
          Ready to go?
        </h2>
        <p className="mt-3 text-slate-400 text-lg">
          Your gateway will be running in its own isolated VM in minutes.
        </p>

        <div className="mt-10 max-w-4xl mx-auto text-left">
          <Terminal
            title="~"
            copyText="curl -fsSL https://raw.githubusercontent.com/TimBeyer/clawctl/main/install.sh | bash"
          >
            <div className="text-slate-300">
              <Prompt />
              <span className="text-slate-200">
                curl -fsSL https://raw.githubusercontent.com/TimBeyer/clawctl/main/install.sh | bash
              </span>
            </div>
            <div className="text-slate-300 mt-1">
              <Prompt />
              <span className="text-slate-200">clawctl create</span>
              <Cursor />
            </div>
          </Terminal>
        </div>
      </FadeIn>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <span className="font-display font-bold text-slate-400 tracking-tight">clawctl</span>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/TimBeyer/clawctl"
            className="hover:text-slate-300 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://docs.openclaw.ai/"
            className="hover:text-slate-300 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenClaw Docs
          </a>
          <span>MIT License</span>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <div className="min-h-screen relative">
      {/* Background layers */}
      <div className="fixed inset-0 bg-dots pointer-events-none" />
      <div className="fixed inset-0 bg-glow-hero pointer-events-none" />
      <div className="noise-overlay" />

      <Nav />
      <Hero />

      <CreateDemo />
      <Divider />

      <div className="bg-glow-mid">
        <FleetDemo />
        <Divider />
        <Features />
      </div>

      <Divider />
      <ConfigSection />
      <Divider />
      <ManagementDemo />
      <Divider />
      <FinalCTA />
      <Footer />
    </div>
  );
}
