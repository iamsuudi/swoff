import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const app = express();
const PORT = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, "db.json");

function readDb() {
  return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

function writeDb(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

let sessions = new Map();

function loadSessions() {
  try {
    const db = readDb();
    if (db.sessions) {
      sessions = new Map(db.sessions.map((s) => [s.id, s]));
    }
  } catch {
    sessions = new Map();
  }
}

function saveSessions() {
  const db = readDb();
  db.sessions = Array.from(sessions.values());
  writeDb(db);
}

loadSessions();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

function authenticate(req, res, next) {
  const sessionId = req.cookies?.swoff_session;
  if (!sessionId) return res.status(401).json({ error: "Unauthorized" });
  const session = sessions.get(sessionId);
  if (!session) return res.status(401).json({ error: "Invalid session" });
  const db = readDb();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    sessions.delete(sessionId);
    saveSessions();
    return res.status(401).json({ error: "User not found" });
  }
  req.user = { id: user.id, email: user.email };
  next();
}

app.post("/api/login", (req, res) => {
  const db = readDb();
  const { email, password } = req.body;
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const sessionId = randomUUID();
  sessions.set(sessionId, { id: sessionId, userId: user.id, createdAt: new Date().toISOString() });
  saveSessions();
  res.cookie("swoff_session", sessionId, { httpOnly: true, sameSite: "strict", maxAge: 86400000, path: "/" });
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

app.post("/api/register", (req, res) => {
  const db = readDb();
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: "Missing fields" });
  if (db.users.find((u) => u.email === email)) return res.status(409).json({ error: "Email already registered" });
  const id = db.users.length + 1;
  db.users.push({ id, email, name, password });
  const sessionId = randomUUID();
  sessions.set(sessionId, { id: sessionId, userId: id, createdAt: new Date().toISOString() });
  writeDb(db);
  saveSessions();
  res.cookie("swoff_session", sessionId, { httpOnly: true, sameSite: "strict", maxAge: 86400000, path: "/" });
  res.status(201).json({ user: { id, email, name } });
});

app.post("/api/logout", authenticate, (req, res) => {
  const sessionId = req.cookies?.swoff_session;
  if (sessionId) {
    sessions.delete(sessionId);
    saveSessions();
  }
  res.clearCookie("swoff_session", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/me", authenticate, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, email: user.email, name: user.name });
});

app.get("/api/notes", authenticate, (req, res) => {
  const db = readDb();
  res.json(db.notes.filter((n) => n.userId === req.user.id));
});

app.get("/api/notes/:id", authenticate, (req, res) => {
  const db = readDb();
  const note = db.notes.find((n) => n.id === Number(req.params.id) && n.userId === req.user.id);
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
});

app.post("/api/notes", authenticate, (req, res) => {
  const db = readDb();
  const { title, description, priority = "medium" } = req.body;
  if (!title || !description) return res.status(400).json({ error: "Missing required fields" });
  const now = new Date().toISOString();
  const note = { id: db.nextNoteId++, title, description, priority, createdAt: now, updatedAt: now, userId: req.user.id };
  db.notes.push(note);
  writeDb(db);
  res.status(201).json(note);
});

app.put("/api/notes/:id", authenticate, (req, res) => {
  const db = readDb();
  const idx = db.notes.findIndex((n) => n.id === Number(req.params.id) && n.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "Note not found" });
  const { title, description, priority } = req.body;
  db.notes[idx] = { ...db.notes[idx], ...(title && { title }), ...(description && { description }), ...(priority && { priority }), updatedAt: new Date().toISOString() };
  writeDb(db);
  res.json(db.notes[idx]);
});

app.delete("/api/notes/:id", authenticate, (req, res) => {
  const db = readDb();
  const idx = db.notes.findIndex((n) => n.id === Number(req.params.id) && n.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "Note not found" });
  db.notes.splice(idx, 1);
  writeDb(db);
  res.status(204).end();
});

const distPath = join(__dirname, "..", "dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/{*path}", (req, res) => res.sendFile(distPath + "/index.html"));
}

app.listen(PORT, () => {
  console.log(`Swoff demo API (session) running at http://localhost:${PORT}`);
});
