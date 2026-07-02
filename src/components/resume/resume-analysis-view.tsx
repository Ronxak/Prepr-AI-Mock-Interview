import { Briefcase, GraduationCap, FolderGit2, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResumeAnalysis } from "@/types/resume";

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <Badge key={s} variant="secondary">
          {s}
        </Badge>
      ))}
    </div>
  );
}

export function ResumeAnalysisView({ analysis }: { analysis: ResumeAnalysis }) {
  const skillGroups = [
    { label: "Languages", items: analysis.programmingLanguages },
    { label: "Frameworks", items: analysis.frameworks },
    { label: "Databases", items: analysis.databases },
    { label: "Cloud", items: analysis.cloudPlatforms },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {(analysis.fullName || analysis.headline || analysis.summary) && (
        <Card>
          <CardHeader>
            <CardTitle>{analysis.fullName ?? "Candidate"}</CardTitle>
            {analysis.headline && (
              <p className="text-sm text-muted-foreground">{analysis.headline}</p>
            )}
          </CardHeader>
          {analysis.summary && (
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {analysis.summary}
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {(skillGroups.length > 0 || analysis.skills.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {skillGroups.map((g) => (
              <div key={g.label} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{g.label}</p>
                <Chips items={g.items} />
              </div>
            ))}
            {skillGroups.length === 0 && <Chips items={analysis.skills} />}
          </CardContent>
        </Card>
      )}

      {analysis.projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderGit2 className="size-4" /> Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.projects.map((p, i) => (
              <div key={i} className="border-l-2 border-border pl-4">
                <p className="font-medium">{p.name}</p>
                {p.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{p.description}</p>
                )}
                {p.technologies.length > 0 && (
                  <div className="mt-2">
                    <Chips items={p.technologies} />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {analysis.experience.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="size-4" /> Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.experience.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {e.role}
                    {e.company ? ` · ${e.company}` : ""}
                  </p>
                  {e.duration && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {e.duration}
                    </span>
                  )}
                </div>
                {e.highlights.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                    {e.highlights.slice(0, 4).map((h, j) => (
                      <li key={j}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {analysis.education.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="size-4" /> Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {analysis.education.map((e, i) => (
                <div key={i} className="text-sm">
                  <p className="font-medium">{e.degree || e.institution}</p>
                  <p className="text-muted-foreground">
                    {[e.institution, e.year].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {(analysis.certificates.length > 0 || analysis.achievements.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="size-4" /> Achievements &amp; Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {[...analysis.achievements, ...analysis.certificates]
                  .slice(0, 6)
                  .map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
