import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { chatJSON, type ChatMessage } from "@/lib/llm/groq";
import { hasGroq } from "@/lib/env";
import { embed, embedOne, toVectorLiteral } from "@/lib/embeddings";
import {
  extractResumeText,
  type ResumeFileType,
} from "@/lib/resume/extract";
import type { ResumeAnalysis, ResumeSummary } from "@/types/resume";

const strArr = z.array(z.string()).default([]);

const resumeAnalysisSchema = z.object({
  fullName: z.string().nullable().catch(null).default(null),
  headline: z.string().catch("").default(""),
  summary: z.string().catch("").default(""),
  skills: strArr,
  programmingLanguages: strArr,
  frameworks: strArr,
  databases: strArr,
  cloudPlatforms: strArr,
  projects: z
    .array(
      z.object({
        name: z.string().default(""),
        description: z.string().default(""),
        technologies: strArr,
      }),
    )
    .default([]),
  experience: z
    .array(
      z.object({
        company: z.string().default(""),
        role: z.string().default(""),
        duration: z.string().nullable().default(null),
        highlights: strArr,
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string().default(""),
        degree: z.string().default(""),
        year: z.string().nullable().default(null),
      }),
    )
    .default([]),
  achievements: strArr,
  certificates: strArr,
  areasOfExpertise: strArr,
});

const RESUME_SYSTEM = `You are an expert technical recruiter that extracts structured data from resumes.
Read the resume and return a single JSON object describing the candidate.
Only use information present in the resume — never invent projects, employers, or skills.
Keep descriptions concise. "headline" is a one-line professional summary (e.g. "Full-stack engineer, 3y, React/Node").
Respond with json only, matching exactly these keys:
fullName (string|null), headline (string), summary (string), skills (string[]),
programmingLanguages (string[]), frameworks (string[]), databases (string[]),
cloudPlatforms (string[]), projects ({name, description, technologies[]}[]),
experience ({company, role, duration, highlights[]}[]),
education ({institution, degree, year}[]), achievements (string[]),
certificates (string[]), areasOfExpertise (string[]).`;

function emptyAnalysis(text: string): ResumeAnalysis {
  return {
    fullName: null,
    headline: "",
    summary: text.slice(0, 400),
    skills: [],
    programmingLanguages: [],
    frameworks: [],
    databases: [],
    cloudPlatforms: [],
    projects: [],
    experience: [],
    education: [],
    achievements: [],
    certificates: [],
    areasOfExpertise: [],
  };
}

/** LLM resume analysis with graceful fallback (never hard-fails an upload). */
export async function analyzeResumeText(text: string): Promise<ResumeAnalysis> {
  if (!hasGroq()) return emptyAnalysis(text);
  const messages: ChatMessage[] = [
    { role: "system", content: RESUME_SYSTEM },
    { role: "user", content: `Resume:\n\n${text.slice(0, 12000)}` },
  ];
  try {
    return await chatJSON(messages, resumeAnalysisSchema, {
      speed: "quality",
      maxTokens: 1600,
    });
  } catch (err) {
    console.error("[resume] analysis failed, using fallback:", err);
    return emptyAnalysis(text);
  }
}

function chunkResume(text: string, size = 480, overlap = 80): string[] {
  const clean = text.replace(/\n{2,}/g, "\n").trim();
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += size - overlap) {
    const piece = clean.slice(i, i + size).trim();
    if (piece.length > 20) chunks.push(piece);
  }
  return chunks.slice(0, 40);
}

/** Embed and store resume chunks for pgvector semantic recall (best-effort). */
async function indexResumeChunks(resumeId: string, text: string): Promise<void> {
  const chunks = chunkResume(text);
  if (chunks.length === 0) return;
  const vectors = await embed(chunks);
  for (let i = 0; i < chunks.length; i++) {
    const vec = vectors[i];
    if (!vec || vec.length === 0) continue;
    const row = await prisma.resumeChunk.create({
      data: { resumeId, content: chunks[i]! },
      select: { id: true },
    });
    await prisma.$executeRaw`
      UPDATE resume_chunks SET embedding = ${toVectorLiteral(vec)}::vector
      WHERE id = ${row.id}`;
  }
}

export async function analyzeAndStoreResume(
  userId: string,
  file: { fileName: string; fileType: ResumeFileType; buffer: Buffer },
): Promise<ResumeSummary> {
  const rawText = await extractResumeText(file.buffer, file.fileType);
  if (rawText.trim().length < 40) {
    throw new ApiError(
      422,
      "We couldn't read enough text from this file. Use a text-based PDF, DOCX, or TXT.",
      "RESUME_EMPTY",
    );
  }

  const analysis = await analyzeResumeText(rawText);

  const resume = await prisma.resume.create({
    data: {
      userId,
      fileName: file.fileName,
      fileType: file.fileType,
      rawText,
      analysis: analysis as unknown as Prisma.InputJsonValue,
    },
    select: { id: true, fileName: true, fileType: true, createdAt: true },
  });

  try {
    await indexResumeChunks(resume.id, rawText);
  } catch (err) {
    console.error("[resume] chunk indexing failed (non-fatal):", err);
  }

  return {
    id: resume.id,
    fileName: resume.fileName,
    fileType: resume.fileType,
    createdAt: resume.createdAt.toISOString(),
    analysis,
  };
}

export async function getLatestResume(
  userId: string,
): Promise<{ id: string; fileName: string; fileType: string; createdAt: Date; analysis: ResumeAnalysis } | null> {
  const row = await prisma.resume.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  return {
    ...row,
    analysis: row.analysis as unknown as ResumeAnalysis,
  };
}

export async function getAllResumes(
  userId: string,
): Promise<ResumeSummary[]> {
  const rows = await prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    // Deliberately omit rawText — it's large and never needed by the client.
    select: { id: true, fileName: true, fileType: true, createdAt: true, analysis: true },
  });
  return rows.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    fileType: row.fileType,
    createdAt: row.createdAt.toISOString(),
    analysis: row.analysis as unknown as ResumeAnalysis,
  }));
}

export async function deleteResume(id: string, userId: string) {
  const row = await prisma.resume.findFirst({ where: { id, userId } });
  if (!row) throw new ApiError(404, "Resume not found.");
  await prisma.resume.delete({ where: { id } });
}

/** Load a resume's analysis, verifying ownership (used at interview start). */
export async function getResumeAnalysisForUser(
  resumeId: string,
  userId: string,
): Promise<ResumeAnalysis | null> {
  const r = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
    select: { analysis: true },
  });
  return r ? (r.analysis as unknown as ResumeAnalysis) : null;
}

/** pgvector cosine search over a resume's chunks. Best-effort (returns [] on error). */
export async function semanticResumeSearch(
  resumeId: string,
  query: string,
  k = 3,
): Promise<string[]> {
  if (!query.trim()) return [];
  try {
    const qv = await embedOne(query);
    if (qv.length === 0) return [];
    const rows = await prisma.$queryRaw<{ content: string }[]>`
      SELECT content FROM resume_chunks
      WHERE "resumeId" = ${resumeId} AND embedding IS NOT NULL
      ORDER BY embedding <=> ${toVectorLiteral(qv)}::vector
      LIMIT ${k}`;
    return rows.map((r) => r.content);
  } catch (err) {
    console.error("[resume] semantic search failed (non-fatal):", err);
    return [];
  }
}
