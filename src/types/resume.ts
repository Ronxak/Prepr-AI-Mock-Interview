export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
}

export interface ResumeExperience {
  company: string;
  role: string;
  duration: string | null;
  highlights: string[];
}

export interface ResumeEducation {
  institution: string;
  degree: string;
  year: string | null;
}

/** Structured resume extracted by the LLM. Persisted as Resume.analysis (JSON). */
export interface ResumeAnalysis {
  fullName: string | null;
  headline: string;
  summary: string;
  skills: string[];
  programmingLanguages: string[];
  frameworks: string[];
  databases: string[];
  cloudPlatforms: string[];
  projects: ResumeProject[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  achievements: string[];
  certificates: string[];
  areasOfExpertise: string[];
}

export interface ResumeSummary {
  id: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  analysis: ResumeAnalysis;
}
