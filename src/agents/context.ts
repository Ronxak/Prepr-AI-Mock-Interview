import type {
  InterviewStateData,
  TurnMessage,
} from "@/types/interview";
import type { ResumeAnalysis } from "@/types/resume";

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Merge new items into a capped, de-duplicated list (case-insensitive). */
export function mergeUnique(existing: string[], incoming: string[], cap = 12): string[] {
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const out = [...existing];
  for (const item of incoming) {
    const key = item.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(item.trim());
    }
  }
  return out.slice(-cap);
}

const DIFFICULTY_LABEL = ["", "very easy", "easy", "moderate", "hard", "very hard"];

export function difficultyLabel(d: number): string {
  return DIFFICULTY_LABEL[clamp(Math.round(d), 1, 5)] ?? "moderate";
}

/** Compact resume brief for prompts. Empty string when no resume. */
export function formatResume(resume: ResumeAnalysis | null): string {
  if (!resume) return "";
  const lines: string[] = [];
  if (resume.fullName) lines.push(`Name: ${resume.fullName}`);
  if (resume.headline) lines.push(`Headline: ${resume.headline}`);
  const tech = [
    resume.programmingLanguages.length && `Languages: ${resume.programmingLanguages.join(", ")}`,
    resume.frameworks.length && `Frameworks: ${resume.frameworks.join(", ")}`,
    resume.databases.length && `Databases: ${resume.databases.join(", ")}`,
    resume.cloudPlatforms.length && `Cloud: ${resume.cloudPlatforms.join(", ")}`,
  ].filter(Boolean);
  lines.push(...(tech as string[]));
  if (resume.projects.length) {
    lines.push("Projects:");
    for (const p of resume.projects.slice(0, 5)) {
      const t = p.technologies.length ? ` [${p.technologies.join(", ")}]` : "";
      lines.push(`  • ${p.name}: ${p.description}${t}`);
    }
  }
  if (resume.experience.length) {
    lines.push("Experience:");
    for (const e of resume.experience.slice(0, 4)) {
      lines.push(`  • ${e.role} @ ${e.company}${e.duration ? ` (${e.duration})` : ""}`);
    }
  }
  return lines.join("\n");
}

export function formatHistory(history: TurnMessage[], limit = 10): string {
  return history
    .slice(-limit)
    .map((m) => `${m.role === "interviewer" ? "Interviewer" : "Candidate"}: ${m.content}`)
    .join("\n");
}

export function formatTopicBoard(data: InterviewStateData): string {
  return data.topics
    .map((t) => {
      const flag = t.topic === data.currentTopic ? "→ " : "  ";
      return `${flag}${t.topic} (${t.status}${t.questionsAsked ? `, ${t.questionsAsked}q` : ""})`;
    })
    .join("\n");
}

export function pendingTopics(data: InterviewStateData): string[] {
  return data.topics
    .filter((t) => t.status === "pending")
    .map((t) => t.topic);
}
