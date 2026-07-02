import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getAllResumes } from "@/services/resume.service";
import { StartInterviewPanel } from "@/components/interview/start-interview-panel";

export const metadata: Metadata = { title: "New interview" };

export default async function NewInterviewPage() {
  const user = await getCurrentUser();
  const resumes = await getAllResumes(user!.id);

  return (
    <StartInterviewPanel
      resumes={resumes.map(r => ({ id: r.id, fileName: r.fileName }))}
    />
  );
}
