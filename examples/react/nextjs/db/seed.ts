import { config } from "dotenv";
config();

import { db } from "../lib/db";
import { user, account, notes } from "./schema";
import { hashPassword } from "@better-auth/utils/password";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const existingUser = await db
    .select()
    .from(user)
    .where(eq(user.email, "demo@swoff.dev"))
    .limit(1);

  let demoUser = existingUser[0];

  if (!demoUser) {
    console.log("Creating demo user...");
    const hashedPassword = await hashPassword("password123");
    const userId = nanoid();
    const now = new Date().toISOString();

    await db.insert(user).values({
      id: userId,
      name: "Demo User",
      email: "demo@swoff.dev",
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(account).values({
      id: nanoid(),
      accountId: "demo@swoff.dev",
      providerId: "credential",
      userId: userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    demoUser = (
      await db.select().from(user).where(eq(user.email, "demo@swoff.dev")).limit(1)
    )[0];
    console.log("Demo user created.");
  } else {
    console.log("Demo user already exists.");
  }

  const existingNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, demoUser.id))
    .limit(1);

  if (existingNotes.length > 0) {
    console.log("Notes already exist for demo user. Skipping seed.");
    return;
  }

  const sampleNotes = [
    { userId: demoUser.id, title: "Welcome to Swoff", description: "This is your first note. Try editing it or creating new ones!", priority: "high" as const },
    { userId: demoUser.id, title: "Offline-First Architecture", description: "Swoff uses a Service Worker with 6 caching strategies, an offline mutation queue, and tag-based cache invalidation.", priority: "high" as const },
    { userId: demoUser.id, title: "Try Going Offline", description: "Open DevTools, go offline, and make some changes. They'll sync automatically when you reconnect.", priority: "medium" as const },
    { userId: demoUser.id, title: "Cross-Tab Sync", description: "Changes made in one tab are reflected across all open tabs via SSE and Service Worker broadcasts.", priority: "medium" as const },
    { userId: demoUser.id, title: "Grocery List", description: "Milk, eggs, bread, avocados, coffee beans", priority: "low" as const },
  ];

  for (const note of sampleNotes) {
    await db.insert(notes).values(note);
  }

  console.log(`Seeded ${sampleNotes.length} notes for demo user.`);
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .then(() => {
    console.log("Done.");
    process.exit(0);
  });
