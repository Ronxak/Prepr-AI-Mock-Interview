# AI Mock Interview Platform — Architecture

## Phase 1 — System Architecture

### Guiding principle
The product is a **live, adaptive interviewer**, not a chatbot. Every design choice
optimizes for two things: (1) a low-latency voice loop, and (2) a reasoning pipeline
that *evaluates before it speaks*.

### The one decision that shapes everything: a single TypeScript runtime
The brief mandates LangGraph + local `bge-small-en-v1.5` embeddings **and**
"TypeScript everywhere". Those usually pull in opposite directions (LangGraph and
HuggingFace embeddings are Python-first). We resolve the tension by staying 100% TS:

| Concern              | Choice                              | Why                                                        |
| -------------------- | ----------------------------------- | ---------------------------------------------------------- |
| Conversation engine  | `@langchain/langgraph` (LangGraph.js) | Real StateGraph, keeps the mandate, no polyglot service    |
| Local embeddings     | `fastembed` (Node)                  | Its **default model is `BAAI/bge-small-en-v1.5`** (384-d)  |
| LLM                  | `groq-sdk` (JSON mode)              | Deterministic structured output for evaluator/planner      |
| App + API            | Next.js 15 App Router               | One deployable, colocated server + client, RSC + edge auth |

Result: **one process, one language, one deploy target.** No Python sidecar.

### Runtime topology
```
                       ┌─────────────────────────────────────────────┐
   Browser (client)    │              Next.js 15 (App Router)         │
 ┌──────────────────┐  │                                              │
 │ Live Interview UI │  │  ┌────────────┐   ┌───────────────────────┐ │
 │  - mic capture    │──┼─▶│ API Routes │──▶│  Service layer        │ │
 │  - wave / timer   │  │  │ (nodejs)   │   │  auth / resume / ...  │ │
 │  - TTS playback   │◀─┼──│            │   └──────────┬────────────┘ │
 └──────────────────┘  │  └─────┬──────┘              │              │
        │  ▲            │        │ edge                ▼              │
        │  │            │   ┌────┴─────┐      ┌──────────────────┐    │
   STT  │  │ TTS        │   │middleware│      │  Interview Engine│    │
        ▼  │            │   │ JWT/jose │      │  (LangGraph.js)  │    │
 ┌──────────────────┐   │   └──────────┘      │ evaluator→planner│    │
 │ Deepgram (STT)   │   │                     │ →interviewer     │    │
 │ Cartesia (TTS)   │   │                     └────────┬─────────┘    │
 │ + browser fallbk │   │                              │             │
 └──────────────────┘   │   ┌──────────┐    ┌──────────▼─────────┐   │
                        │   │ Groq LLM │◀───│  Prisma  + pgvector │   │
                        │   │fastembed │    │  PostgreSQL         │   │
                        │   └──────────┘    └────────────────────┘   │
                        └─────────────────────────────────────────────┘
```

### The voice + reasoning loop (per candidate answer)
```
mic ─▶ Deepgram stream ─▶ interim+final transcript ─▶ POST /api/interview/turn
      │(browser SR fallback)                          │
      │                                                ▼
      │                         LangGraph: MEMORY ─▶ EVALUATOR ─▶ PLANNER ─┐
      │                                                                     │ decides:
      │                                                                     │ follow-up /
      │                                                                     │ challenge /
      │                                                                     │ move topic /
      │                                                                     │ end
      │                                                                     ▼
      └──── audio ◀── Cartesia TTS ◀── streamed text ◀────────────── INTERVIEWER
             (browser speechSynthesis fallback)
```
The interviewer node runs **last and only after** evaluation + planning, guaranteeing
"reason before you speak". The interviewer never scores; the evaluator never talks.

### Latency strategy
- STT is streaming (partial transcripts) so the UI feels live.
- Evaluator + planner use the **fast** Groq model (`llama-3.1-8b-instant`), the
  interviewer and report use the **quality** model (`llama-3.3-70b-versatile`).
- The interviewer response is streamed token-by-token straight into TTS.
- Resume analysis + report generation are the only "slow" paths and are off the hot loop.

## Phase 2 — Database (see `prisma/schema.prisma`)
Relational core (`User → Interview → ConversationTurn/Evaluation/TopicProgress → InterviewReport`)
plus a `ResumeChunk.embedding vector(384)` column (pgvector) for semantic resume recall.
Live interview state is snapshotted as JSON on `Interview.state` so a refresh/reconnect
resumes exactly where it left off.

## Phase 3 — Folder structure (see `docs/FOLDER_STRUCTURE.md`)
Clean layering: `app/` (routes + UI) → `services/` (business logic) → `agents/`
(LangGraph) → `lib/` (infra: db, auth, llm, embeddings). **No business logic in UI.**
