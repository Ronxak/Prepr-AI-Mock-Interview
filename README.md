# Prepr — AI Mock Interview Platform

> A live, **voice-first** mock interviewer that listens, asks sharp follow-ups,
> challenges weak reasoning, adapts difficulty in real time, and hands you an
> **evidence-backed** scorecard. Not a chatbot. Not a question bank.

Built end-to-end in **TypeScript** — Next.js App Router, a **LangGraph** reasoning
engine over **Groq**, **PostgreSQL + pgvector**, local **BAAI/bge-small-en-v1.5**
embeddings, **Deepgram** streaming STT and **Cartesia** TTS (with browser
fallbacks). No OpenAI, no Anthropic, no paid embedding APIs.

---

## The problem

Most "mock interview" tools are one of two things: a static bank of questions
with no memory of what you actually said, or a text chatbot that asks whatever
comes next regardless of how well you just answered. Neither resembles a real
interview, where the interviewer:

- listens to your actual answer before deciding what to ask next,
- goes deeper when you're strong and backs off with hints when you're not,
- remembers a claim you made three questions ago and comes back to it,
- and, afterward, justifies every score with something you actually said —
  not a number pulled out of a rubric.

Practicing out loud also matters — reading a question and typing a response
exercises a different skill than speaking under mild time pressure. A tool
that only works over text skips the part that's actually hard.

There's a second, more technical problem baked into the brief this project
was built against: it asks for a LangGraph-based reasoning engine **and**
local `bge-small-en-v1.5` embeddings **and** "TypeScript everywhere." The
LangGraph and Hugging Face embedding ecosystems are Python-first — normally
you'd reach for a Python service and call it from the Next.js app over HTTP,
which means two runtimes, two deploy targets, and a network hop in the hot
path of a real-time voice loop.

## Approach

The interview is modeled as a turn-based reasoning pipeline, not a single LLM
call. Every candidate answer runs through four cooperating stages before
anything is said back:

```
memory  →  evaluator  →  planner  →  interviewer
(recall)   (scores,      (decides    (speaks — and
            never talks)  what's      only after the
                           next)       first three ran)
```

`memory` loads conversation history, resume context, and topics already
covered. `evaluator` scores the last answer against a fixed rubric
(correctness, depth, confidence, communication, technical) and produces
evidence quotes — it never generates interviewer dialogue. `planner` turns
those scores into a decision — `continue | follow_up | challenge |
move_topic | end` — plus a difficulty delta, with deterministic guardrails
so the LLM can't wander off-script. Only then does `interviewer` speak,
using the plan as its instruction. This ordering is the whole point: the
system reasons before it talks, so follow-ups are actually contingent on
what you said rather than generated independently of it.

Everything the interviewer says or scores is persisted turn-by-turn, so the
final report can cite direct quotes as evidence for every dimension instead
of presenting an unexplained number.

For the runtime-split problem, the fix was to stay on one language rather
than bridge two: LangGraph.js (`@langchain/langgraph`) gives a real
StateGraph in TypeScript, and `fastembed`'s default model happens to *be*
`BAAI/bge-small-en-v1.5` — so the "local embeddings" requirement is met
without a Python process at all. One runtime, one deploy target, no
polyglot service boundary in the middle of a latency-sensitive voice loop.

Voice and LLM providers are treated as optional adapters behind a fallback,
not hard dependencies — the app is fully usable with zero paid API keys
(browser `SpeechRecognition` / `speechSynthesis` stand in for Deepgram /
Cartesia, and without `GROQ_API_KEY` auth, resume upload, and the DB layer
all still work). This matters for a project meant to be cloned and run by
someone who may not want to provision three API keys just to see it boot.

## Key decisions

The defining decision is covered above — one TypeScript runtime instead of a
Python sidecar for LangGraph + embeddings. The rest of the stack follows
from optimizing for a low-latency voice loop and a codebase that stays easy
to reason about:

| Decision | Why | Trade-off accepted |
| --- | --- | --- |
| LangGraph.js over Python LangGraph | Keeps the reasoning engine, DB layer, and API in one process/language | Smaller ecosystem of reference examples than the Python package |
| `fastembed` (local) over a hosted embedding API | No per-request cost or key; default model matches the brief exactly | ~90MB model download on first run adds cold-start latency |
| Groq over OpenAI/Anthropic | Fast inference, generous free tier, native JSON mode for structured evaluator/planner output | Smaller model ceiling than GPT-4/Claude-class for very nuanced judgment — mitigated with a strict rubric and a quality/fast model split (interviewer + report use the 70B model, evaluator/planner use the 8B model for latency) |
| Deepgram + Cartesia as optional adapters with browser fallback | App runs fully with zero paid keys; keys never reach the client (short-lived token for STT, proxied audio for TTS) | Fallback voices/transcription are lower quality than the paid providers |
| `Interview.state` as a JSON snapshot rather than fully normalized live-state tables | A page refresh or reconnect resumes exactly where it left off with one read; simpler than reconstructing state from an event log | Live in-progress state isn't queryable with SQL — acceptable because turns, evaluations, and the final report *are* fully normalized once persisted |
| JWT via `jose` instead of a server-side session store | Edge middleware can verify auth without a DB round trip on every request | Revocation isn't instant — mitigated with a short `JWT_EXPIRES_IN` |
| Next.js Route Handlers + a plain service layer instead of a separate backend | One deployable; `services/` has no `NextRequest` in it, so the same functions would work behind a queue/worker later | None significant at this scale — would reconsider only if the API needed to be consumed by something other than this frontend |

## Architecture

```
                       ┌──────────────────────────────────────────────┐
   Browser (client)    │              Next.js (App Router)             │
 ┌──────────────────┐  │                                              │
 │ Live Interview UI │──┼─▶ API Routes ─▶ Service layer ─────────────┐ │
 │ mic · wave · TTS  │◀─┼──  (nodejs)      auth/resume/interview/...  │ │
 └───────┬──────────┘  │        │ edge                               │ │
   STT   │  ▲ TTS       │   ┌────┴─────┐         ┌────────────────────▼┐│
 ┌───────▼──┴────────┐  │   │  proxy   │         │  Interview Engine    ││
 │ Deepgram · Cartesia│  │   │ JWT/jose │         │  (LangGraph.js)      ││
 │  + browser fallbk  │  │   └──────────┘         │ memory→evaluator→    ││
 └───────────────────┘  │                         │ planner→interviewer  ││
                        │   ┌──────────┐  ┌────────┴──────────┐          ││
                        │   │ Groq LLM │  │ Prisma + pgvector │◀─────────┘│
                        │   │fastembed │  │ PostgreSQL        │           │
                        │   └──────────┘  └───────────────────┘           │
                        └──────────────────────────────────────────────┘
```

Full write-up: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) ·
Layout: [`docs/FOLDER_STRUCTURE.md`](docs/FOLDER_STRUCTURE.md)

## Core loop, end to end

This is what actually happens across one interview turn, shown as the real
API calls the frontend makes (trimmed for readability). It's the same
sequence used to verify the build during development.

**1. Register and start an interview**

```bash
curl -X POST localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jane Doe","email":"you@example.com","password":"..."}'
# → {"data":{"user":{"id":"...","email":"you@example.com","name":"Jane Doe"}}}

curl -X POST localhost:3000/api/interview/start \
  -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"type":"FRONTEND_ENGINEER","difficultyPreset":3}'
```

The `planner` node has no prior turns to react to, so it opens on a warm-up
topic. The `interviewer` node produces the actual question:

```json
{
  "data": {
    "interviewId": "cmr43y0gb0002shgtcv7c9a8n",
    "question": "Hi, it's great to have you on the call, let's take it easy and have a conversation about your experience. I'd love to hear about a project that stands out to you, perhaps something you've worked on with JavaScript. Can you tell me about a recent or favorite project where you used JavaScript?",
    "topic": "JavaScript"
  }
}
```

**2. The candidate answers — this is where the pipeline actually runs**

```bash
curl -X POST localhost:3000/api/interview/turn \
  -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"interviewId":"cmr43y...","transcript":"I built a React dashboard using hooks and context for state management, with a focus on performance via memoization."}'
```

Behind this one request: `memory` loads the conversation so far, `evaluator`
scores the answer and extracts evidence quotes, `planner` looks at those
scores and decides to stay on-topic and dig one level deeper rather than
moving on, and only then does `interviewer` generate the next line —
contingent on the specific technique ("memoization") the candidate mentioned:

```json
{
  "data": {
    "question": "That's a great approach to performance optimization. How did you determine which components or functions to prioritize for memoization in your React dashboard?",
    "ended": false,
    "topic": "JavaScript",
    "difficulty": 3,
    "questionCount": 2,
    "maxQuestions": 10
  }
}
```

Note this isn't a generic follow-up — it couldn't have been generated
without the evaluator/planner stage reading the actual transcript first.

**3. End the interview and pull the report**

```bash
curl -X POST localhost:3000/api/interview/end -b cookies.txt \
  -H 'Content-Type: application/json' -d '{"interviewId":"cmr43y..."}'

curl localhost:3000/api/report/cmr43y... -b cookies.txt
```

The report is generated from the full, persisted transcript — every score
below is backed by a stored evidence quote, not produced independently of it:

```json
{
  "overallScore": 8.1,
  "technicalScore": 8,
  "communicationScore": 9,
  "confidenceScore": 8,
  "problemSolvingScore": 7,
  "behaviorScore": 9,
  "strengths": [
    "Provided a concrete example of a project, specifically a React dashboard",
    "Demonstrated knowledge of state management techniques, including hooks and context"
  ],
  "weaknesses": [
    "Lacked details about the project's goals or impact",
    "Did not mention any challenges or lessons learned from the project"
  ],
  "evidence": [
    {
      "dimension": "Technical",
      "score": 8,
      "quotes": ["I built a React dashboard using hooks and context for state management, with a focus on performance via memoization."]
    }
  ]
}
```

On the frontend, the same loop drives [`useVoiceInterview`](src/hooks/useVoiceInterview.ts):
mic capture → STT (Deepgram or browser fallback) → the `/api/interview/turn`
call above → the returned question is streamed to TTS (Cartesia or browser
fallback) while the waveform and silence-detector auto-submit the next
answer once you stop talking.

## Tech stack

| Layer         | Choice                                                            |
| ------------- | ---------------------------------------------------------------- |
| Frontend      | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui, Framer Motion, Recharts |
| Backend/API   | Next.js Route Handlers (Node runtime), clean service layer       |
| Engine        | LangGraph.js (`@langchain/langgraph`) StateGraph                 |
| LLM           | Groq (`llama-3.3-70b-versatile` quality · `llama-3.1-8b-instant` fast) |
| Embeddings    | `fastembed` → **BAAI/bge-small-en-v1.5** (384-dim), local, no key |
| Speech-to-text| Deepgram streaming → browser `SpeechRecognition` fallback         |
| Text-to-speech| Cartesia (`sonic-2`) → browser `speechSynthesis` fallback        |
| Database      | PostgreSQL 16 + **pgvector**, Prisma ORM                         |
| Auth          | JWT via `jose` (edge-safe), bcrypt (`bcryptjs`)                  |

## Folder structure

```
src/
├── app/
│   ├── (marketing)/      landing page
│   ├── (auth)/           login · signup
│   ├── (app)/            dashboard · resume · interview · report · history · profile
│   └── api/              auth · resume · interview · report · history · profile · voice
├── components/           ui (shadcn) · landing · auth · app · dashboard · interview · report · resume
├── services/             auth · resume · interview · report · analytics   (business logic)
├── agents/               graph · state · schemas · context · prompts · nodes/  (LangGraph)
├── lib/                  env · db · http · auth/ · llm/ · embeddings/ · voice/ · resume/
├── hooks/                useVoiceInterview · useSpeechToText · useTextToSpeech · useAuth
├── types/                shared domain types
├── utils/                pure helpers (format · score)
└── proxy.ts              edge JWT guard for protected routes
```

No business logic lives in UI components; dependencies point inward
(`app → services → agents → lib`). Full write-up:
[`docs/FOLDER_STRUCTURE.md`](docs/FOLDER_STRUCTURE.md).

## Environment variables

Copy `.env.example` to `.env`. Only the first two groups are required; the
AI/voice keys are optional and the app degrades gracefully without them.

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `JWT_SECRET` | Required | At least 16 characters. Generate with `openssl rand -base64 48` |
| `DATABASE_URL` | Required | Matches `docker-compose.yml` by default |
| `GROQ_API_KEY` | Optional | [console.groq.com](https://console.groq.com) — enables the interviewer/evaluator/reports |
| `GROQ_MODEL_QUALITY` / `GROQ_MODEL_FAST` | Optional | Sensible defaults provided |
| `DEEPGRAM_API_KEY` | Optional | Streaming STT; falls back to browser if unset |
| `CARTESIA_API_KEY` / `CARTESIA_VOICE_ID` | Optional | TTS; falls back to browser if unset |
| `EMBEDDING_CACHE_DIR` | Optional | Where bge-small downloads (~90MB, once) |

Keys never reach the browser: Deepgram is used via a short-lived token
(`/api/voice/token`) and Cartesia audio is proxied through `/api/voice/tts`.

## Run locally (5 commands)

**Prerequisites:** Node 20+, Docker.

```bash
cp .env.example .env          # 1. add a JWT_SECRET (and GROQ_API_KEY for AI)
npm install                   # 2. install deps (also generates Prisma client)
npm run db:up                 # 3. start PostgreSQL + pgvector (Docker)
npm run db:push               # 4. create the schema
npm run dev                   # 5. http://localhost:3000
```

Optional demo account: `npm run db:seed` → `demo@prepr.dev` / `demo1234`.

Without `GROQ_API_KEY`, auth, resume upload, and DB flows work and voice
uses the browser engines; the interviewer's questions and reports need Groq
(free tier).

### Handy scripts

| Script | Does |
| ------ | ---- |
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:up` / `db:down` | Start / stop Postgres |
| `npm run db:push` / `db:studio` / `db:seed` | Sync schema / Prisma Studio / seed |

## Deployment

- **App:** Vercel (or any Node host). Set all env vars. `serverExternalPackages`
  already keeps `fastembed`/`onnxruntime-node` out of the client bundle.
- **Database:** any managed Postgres with the `vector` extension (Neon, Supabase,
  RDS + pgvector). Run `prisma migrate deploy` (or `db push`).
- **Embeddings:** bge-small downloads to `EMBEDDING_CACHE_DIR` on first use — on
  ephemeral hosts, bake it into the image or use a persistent volume.

## Screenshots

Run locally and visit:

- `/` — landing
- `/dashboard` — stats, score trend, recent interviews
- `/interview/new` → `/interview/[id]` — the live voice interview
- `/report/[id]` — evidence-based scorecard (radar, dimensions, transcript)
- `/history` — progression analytics

## Recently shipped

- **Live mic-amplitude waveform + silence auto-submit** — the waveform is driven by a real `AnalyserNode`; ~3s of silence auto-submits your answer with a countdown ring.
- **Streaming interviewer speech** — interviewer tokens are synthesized sentence-by-sentence and played as they arrive (`/api/voice/stream`), so audio starts before the full reply is generated (falls back to batch TTS).
- **Four interview tracks + difficulty presets** — Software, Frontend, Data, and Site Reliability Engineer, each with its own topic set; Easy / Medium / Hard starting difficulty.
- **Report export + shareable links** — print-to-PDF from the report, and one-click public share links (`/shared/[token]`) that render read-only without auth (revocable).
- **Multi-resume management** — upload several resumes, view any one's analysis, delete, and choose which to use per interview.
- **Auth-aware landing nav** — the marketing page now checks the session and shows Dashboard/Sign out instead of Sign in once you're already logged in.

## Future improvements

- Real-time mic VAD via Deepgram endpointing (replacing RMS-based silence detection).
- JD-targeted interviews (paste a job description to steer topics).
- WebSocket-native Cartesia streaming for sub-frame TTS latency.

---

<p align="center"><em>Practice, out loud.</em></p>
