import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Card className="border-border/70">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to continue your practice.</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm mode="login" next={next} />
      </CardContent>
    </Card>
  );
}
