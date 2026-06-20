import { db } from "../db";
import { notes } from "../../db/schema";
import { eq, and, like, desc } from "drizzle-orm";

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

export async function getAllNotes(userId: string) {
  return db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt));
}

export async function getNoteById(id: number) {
  const rows = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createNote(data: NewNote) {
  const rows = await db.insert(notes).values(data).returning();
  return rows[0];
}

export async function updateNote(id: number, data: Partial<NewNote>) {
  const rows = await db
    .update(notes)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(notes.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteNote(id: number) {
  await db.delete(notes).where(eq(notes.id, id));
  return { success: true };
}

export async function searchNotes(userId: string, query: string) {
  return db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        like(notes.title, `%${query}%`),
      ),
    )
    .orderBy(desc(notes.updatedAt));
}
