import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "notes.json");

async function readNotes() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeNotes(notes: unknown[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(notes, null, 2));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = await readNotes();
  const note = notes.find((n: any) => n.id === Number(id));
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const notes = await readNotes();
  const index = notes.findIndex((n: any) => n.id === Number(id));
  if (index === -1) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  notes[index] = { ...notes[index], ...body, updatedAt: new Date().toISOString() };
  await writeNotes(notes);
  return NextResponse.json(notes[index]);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = await readNotes();
  const index = notes.findIndex((n: any) => n.id === Number(id));
  if (index === -1) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  notes.splice(index, 1);
  await writeNotes(notes);
  return NextResponse.json({ success: true });
}
