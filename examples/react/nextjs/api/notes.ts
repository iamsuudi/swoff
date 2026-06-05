import { fetchWithCache } from "@/swoff/fetch/core";

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
  const { response } = await fetchWithCache(BASE);
  if (!response.ok) throw new Error("Failed to fetch notes");
  return response.json();
}

export async function getNote(id: number): Promise<Note> {
  const { response } = await fetchWithCache(`${BASE}/${id}`);
  if (!response.ok) throw new Error("Note not found");
  return response.json();
}

export async function createNote(data: { title: string; description: string; priority: string }): Promise<Note> {
  const { response } = await fetchWithCache(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    auth: true,
  });
  if (!response.ok) throw new Error("Failed to create note");
  return response.json();
}

export async function updateNote(id: number, data: { title: string; description: string; priority: string }): Promise<Note> {
  const { response } = await fetchWithCache(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    auth: true,
  });
  if (!response.ok) throw new Error("Failed to update note");
  return response.json();
}

export async function deleteNote(id: number): Promise<void> {
  const { response } = await fetchWithCache(`${BASE}/${id}`, { method: "DELETE", auth: true });
  if (!response.ok) throw new Error("Failed to delete note");
}
