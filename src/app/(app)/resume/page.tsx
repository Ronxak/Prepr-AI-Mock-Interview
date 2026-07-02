import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getAllResumes } from "@/services/resume.service";
import { ResumeUploader } from "@/components/resume/resume-uploader";
import { ResumeList } from "@/components/resume/resume-list";

export const metadata: Metadata = { title: "Resumes" };

export default async function ResumePage() {
  const user = await getCurrentUser();
  const resumes = await getAllResumes(user!.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Your resumes</h2>
        <p className="mt-1 text-muted-foreground">
          Upload one or more resumes and pick which to use when you start an
          interview. Select a resume below to view its analysis.
        </p>
      </div>

      <ResumeUploader hasExisting={resumes.length > 0} />

      <ResumeList resumes={resumes} />
    </div>
  );
}
