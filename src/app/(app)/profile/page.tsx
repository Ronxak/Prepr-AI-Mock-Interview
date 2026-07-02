import Link from "next/link";
import type { Metadata } from "next";
import { Mail, Calendar, Trophy, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getDashboard } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SignOutButton } from "@/components/app/sign-out-button";
import { formatDate } from "@/utils/format";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const stats = await getDashboard(user!.id);
  const initials = user!.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="size-16 text-lg">
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{user!.name}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="size-3.5" /> {user!.email}
            </p>
          </div>
          <SignOutButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row
            icon={<Calendar className="size-4" />}
            label="Member since"
            value={formatDate(user!.createdAt)}
          />
          <Separator />
          <Row
            icon={<Trophy className="size-4" />}
            label="Interviews completed"
            value={String(stats.completedInterviews)}
          />
          <Separator />
          <Row
            icon={<FileText className="size-4" />}
            label="Resume"
            value={
              stats.resumeUploaded ? (
                <Badge variant="success">Uploaded</Badge>
              ) : (
                <Button asChild variant="link" size="sm" className="h-auto p-0">
                  <Link href="/resume">Upload</Link>
                </Button>
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon} {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
