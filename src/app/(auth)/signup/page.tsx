import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Card className="border-border/70">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Start practicing in under a minute.</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm mode="signup" next={next} />
      </CardContent>
    </Card>
  );
}
