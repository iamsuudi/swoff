import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import { setupLogger } from "./logger.js";
import { readDb, writeDb, setupCommon } from "./common.js";

const app = express();
const PORT = 3001;

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
setupLogger(app);

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

setupCommon(app, authenticate);

app.listen(PORT, () => {
  console.log(`Swoff demo API (session) running at http://localhost:${PORT}`);
});
