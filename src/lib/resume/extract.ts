import mammoth from "mammoth";
import { extractText } from "unpdf";

export type ResumeFileType = "pdf" | "docx" | "txt";

const EXT_MAP: Record<string, ResumeFileType> = {
  pdf: "pdf",
  docx: "docx",
  txt: "txt",
  text: "txt",
  md: "txt",
};

/** Resolve a supported resume type from filename/mime, or null if unsupported. */
export function detectResumeType(
  fileName: string,
  mimeType?: string,
): ResumeFileType | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (EXT_MAP[ext]) return EXT_MAP[ext];
  if (mimeType?.includes("pdf")) return "pdf";
  if (mimeType?.includes("word") || mimeType?.includes("officedocument"))
    return "docx";
  if (mimeType?.startsWith("text/")) return "txt";
  return null;
}

function normalize(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractResumeText(
  buffer: Buffer,
  type: ResumeFileType,
): Promise<string> {
  switch (type) {
    case "pdf": {
      const { text } = await extractText(new Uint8Array(buffer), {
        mergePages: true,
      });
      return normalize(text);
    }
    case "docx": {
      const { value } = await mammoth.extractRawText({ buffer });
      return normalize(value);
    }
    case "txt":
      return normalize(buffer.toString("utf-8"));
  }
}
