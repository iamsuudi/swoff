import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";
import cookieParser from "cookie-parser";
import { setupLogger } from "./logger.js";
import { readDb, writeDb, setupCommon } from "./common.js";

const app = express();
const JWT_SECRET = "swoff-demo-secret-key-2026";
const PORT = 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
setupLogger(app);

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "1h",
  });
}

function authenticate(req, res, next) {
  const token = req.cookies?.swoff_token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.post("/api/login", (req, res) => {
  const db = readDb();
  const { email, password } = req.body;
  const user = db.users.find(
    (u) => u.email === email && u.password === password,
  );
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const token = generateToken(user);
  res.cookie("swoff_token", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 3600000,
    path: "/",
  });
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

app.post("/api/register", (req, res) => {
  const db = readDb();
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: "Missing fields" });
  if (db.users.find((u) => u.email === email))
    return res.status(409).json({ error: "Email already registered" });
  const id = db.users.length + 1;
  db.users.push({ id, email, name, password });
  writeDb(db);
  const token = generateToken({ id, email, name });
  res.cookie("swoff_token", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 3600000,
    path: "/",
  });
  res.status(201).json({ user: { id, email, name } });
});

app.post("/api/refresh", authenticate, (req, res) => {
  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(401).json({ error: "User not found" });
  const token = generateToken(user);
  res.cookie("swoff_token", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 3600000,
    path: "/",
  });
  res.json({ ok: true });
});

app.post("/api/logout", authenticate, (req, res) => {
  res.clearCookie("swoff_token", { path: "/" });
  res.json({ ok: true });
});

setupCommon(app, authenticate);

app.listen(PORT, () => {
  console.log(
    `Swoff demo API (cookie JWT) running at http://localhost:${PORT}`,
  );
});
