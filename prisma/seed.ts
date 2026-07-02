import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@prepr.dev";
  const passwordHash = await bcrypt.hash("demo1234", 12);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Demo Candidate", passwordHash },
  });

  console.log(`✔ Seeded demo user → ${email} / demo1234`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
