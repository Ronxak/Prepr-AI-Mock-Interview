import {
  Mic,
  Gauge,
  Brain,
  FileText,
  BarChart3,
  MessageSquareQuote,
  Ear,
  Scale,
  Route,
  Database,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Mic,
    title: "Voice-first, not a chatbox",
    body: "Speak your answers. Streaming speech-to-text and natural TTS make it feel like a real call.",
  },
  {
    icon: Gauge,
    title: "Adaptive difficulty",
    body: "Nail an answer and it digs deeper — architecture, edge cases, trade-offs. Struggle and it eases off with hints.",
  },
  {
    icon: Brain,
    title: "It remembers",
    body: "Bring up a project once and it comes back to it later. It never repeats a question you've already answered.",
  },
  {
    icon: FileText,
    title: "Resume-aware",
    body: "Upload a resume and the interviewer weaves in your real projects — without letting it dominate the session.",
  },
  {
    icon: MessageSquareQuote,
    title: "Evidence-based scores",
    body: "Every score is justified by direct quotes from what you said. No arbitrary numbers.",
  },
  {
    icon: BarChart3,
    title: "Analytics that compound",
    body: "Track technical, communication and confidence over time. See your most-improved and weakest skills.",
  },
];

const STEPS = [
  { n: "01", title: "Upload your resume", body: "Optional. We parse and structure it locally so the interviewer knows your background." },
  { n: "02", title: "Start the interview", body: "Allow your mic and just talk. The AI opens the conversation and takes it from there." },
  { n: "03", title: "Get challenged", body: "Follow-ups, curveballs, topic switches — it reasons before every question it asks." },
  { n: "04", title: "Read your report", body: "A full scorecard with strengths, gaps, learning resources and a replayable transcript." },
];

const AGENTS = [
  { icon: Ear, title: "Interviewer", body: "Talks naturally. Asks, follows up, challenges. Never scores." },
  { icon: Scale, title: "Evaluator", body: "Silently scores every answer on correctness, depth, confidence and communication." },
  { icon: Route, title: "Planner", body: "Decides what happens next: continue, follow up, challenge, switch topic, or end." },
  { icon: Database, title: "Memory", body: "Holds conversation history, resume context and covered topics so nothing repeats." },
];

export function FeatureSection() {
  return (
    <>
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <SectionHeading
          eyebrow="Why it's different"
          title="An interviewer, not a question bank"
          subtitle="Prepr simulates an experienced engineering manager who actually listens and adapts."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="gap-3 p-6 transition-colors hover:border-primary/40">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/12 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-1 font-medium">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="how" className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHeading
            eyebrow="How it works"
            title="From upload to scorecard in one session"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="font-mono text-sm text-primary">{s.n}</div>
                <h3 className="mt-3 font-medium">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="engine" className="mx-auto max-w-6xl px-5 py-20">
        <SectionHeading
          eyebrow="Under the hood"
          title="Four agents. One conversation."
          subtitle="A LangGraph state machine reasons before every response — evaluate, then plan, then speak."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.map((a) => (
            <Card key={a.title} className="gap-3 p-6">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/12 text-primary">
                <a.icon className="size-5" />
              </span>
              <h3 className="mt-1 font-medium">{a.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{a.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="text-sm font-medium text-primary">{eyebrow}</div>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}
