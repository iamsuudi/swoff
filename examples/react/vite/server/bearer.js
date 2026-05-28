import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import webPush from "web-push";
import { setupPush, triggerPushNotification } from "./push.js";
import { setupGraphql } from "./graphql.js";
import { setupLogger } from "./logger.js";

const app = express();
const JWT_SECRET = "swoff-demo-secret-key-2026";
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

app.use(cors());
app.use(express.json());
setupLogger(app);

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
}

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.post("/api/login", (req, res) => {
  const db = readDb();
  const { email, password } = req.body;
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const token = generateToken(user);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name }, expiresAt: Date.now() + 3600000 });
});

app.post("/api/register", (req, res) => {
  const db = readDb();
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: "Missing fields" });
  if (db.users.find((u) => u.email === email)) return res.status(409).json({ error: "Email already registered" });
  const id = db.users.length + 1;
  db.users.push({ id, email, name, password });
  writeDb(db);
  const token = generateToken({ id, email, name });
  res.status(201).json({ token, user: { id, email, name }, expiresAt: Date.now() + 3600000 });
});

app.post("/api/refresh", authenticate, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(401).json({ error: "User not found" });
  const token = generateToken(user);
  res.json({ token, expiresAt: Date.now() + 3600000 });
});

app.post("/api/logout", authenticate, (req, res) => {
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
  triggerPushNotification(readDb, writeDb, webPush, { title: "Note created", body: `"${title}" added` }).catch(() => {});
  res.status(201).json(note);
});

app.put("/api/notes/:id", authenticate, (req, res) => {
  const db = readDb();
  const idx = db.notes.findIndex((n) => n.id === Number(req.params.id) && n.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "Note not found" });
  const { title, description, priority } = req.body;
  db.notes[idx] = { ...db.notes[idx], ...(title && { title }), ...(description && { description }), ...(priority && { priority }), updatedAt: new Date().toISOString() };
  const updated = db.notes[idx];
  writeDb(db);
  triggerPushNotification(readDb, writeDb, webPush, { title: "Note updated", body: `"${updated.title}" updated` }).catch(() => {});
  res.json(updated);
});

app.delete("/api/notes/:id", authenticate, (req, res) => {
  const db = readDb();
  const idx = db.notes.findIndex((n) => n.id === Number(req.params.id) && n.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: "Note not found" });
  db.notes.splice(idx, 1);
  writeDb(db);
  triggerPushNotification(readDb, writeDb, webPush, { title: "Note deleted", body: `Note #${req.params.id} removed` }).catch(() => {});
  res.status(204).end();
});

setupPush(app, readDb, writeDb, webPush);
setupGraphql(app, readDb, writeDb, authenticate, (payload) => {
  triggerPushNotification(readDb, writeDb, webPush, payload).catch(() => {});
});

const distPath = join(__dirname, "..", "dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/{*path}", (req, res) => res.sendFile(distPath + "/index.html"));
}

app.listen(PORT, () => {
  console.log(`Swoff demo API (bearer) running at http://localhost:${PORT}`);
});
