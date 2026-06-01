import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";
import { setupLogger } from "./logger.js";
import { readDb, writeDb, setupCommon } from "./common.js";

const app = express();
const JWT_SECRET = "swoff-demo-secret-key-2026";
const PORT = 3001;

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

setupCommon(app, authenticate);

app.listen(PORT, () => {
  console.log(`Swoff demo API (bearer) running at http://localhost:${PORT}`);
});
