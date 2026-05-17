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

export async function GET() {
  const notes = await readNotes();
  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const notes = await readNotes();
  const newNote = {
    id: Date.now(),
    title: body.title,
    description: body.description,
    priority: body.priority || "low",
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: body.updatedAt || new Date().toISOString(),
  };
  notes.push(newNote);
  await writeNotes(notes);
  return NextResponse.json(newNote, { status: 201 });
}
