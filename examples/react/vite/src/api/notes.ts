export interface Note {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

const BASE = "/api/notes";

export async function getNotes(): Promise<Note[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Failed to fetch notes");
  return res.json();
}

export async function getNote(id: number): Promise<Note> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Note not found");
  return res.json();
}

export async function createNote(data: { title: string; description: string; priority: string }): Promise<Note> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error("Failed to create note");
  return res.json();
}

export async function updateNote(id: number, data: { title: string; description: string; priority: string }): Promise<Note> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error("Failed to update note");
  return res.json();
}

export async function deleteNote(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete note");
}
