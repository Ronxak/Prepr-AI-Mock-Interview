import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { RegisterInput, LoginInput } from "@/lib/validation/auth";

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
}

export async function registerUser(input: RegisterInput): Promise<AuthedUser> {
  const email = input.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists.", "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: { name: input.name.trim(), email, passwordHash },
    select: { id: true, email: true, name: true },
  });
}

export async function authenticateUser(input: LoginInput): Promise<AuthedUser> {
  const email = input.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { email } });
  // Run a hash comparison even when the user is missing to avoid leaking, via
  // timing, whether an email is registered.
  const hash =
    user?.passwordHash ??
    "$2a$12$0000000000000000000000000000000000000000000000000000a";
  const valid = await verifyPassword(input.password, hash);

  if (!user || !valid) {
    throw new ApiError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
  }
  return { id: user.id, email: user.email, name: user.name };
}
