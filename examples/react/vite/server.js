import express from "express";
import jwt from "jsonwebtoken";
import cors from "cors";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const app = express();
const JWT_SECRET = "swoff-demo-secret-key-2026";
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- In-memory seed data ---
let notes = [
  {
    id: 1,
    title: "Welcome to Swoff Notes",
    description:
      "This is a sample note. Edit or delete it, or create new ones!",
    priority: "low",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    userId: 1,
  },
  {
    id: 2,
    title: "Auth is working",
    description:
      "JWT auth with Swoff's auth-store, auth-fetch, auth-user pattern.",
    priority: "medium",
    createdAt: "2026-05-23T14:06:30.262Z",
    updatedAt: "2026-05-23T14:06:30.262Z",
    userId: 1,
  },
];
let todos = [
  {
    id: 1,
    title: "Set up the project",
    description: "Initialize the Swoff demo app with React, Vite, Tailwind.",
    status: "done",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    userId: 1,
  },
  {
    id: 2,
    title: "Integrate auth",
    description: "Wire up JWT auth with login, logout, protected routes.",
    status: "in-progress",
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
    userId: 1,
  },
  {
    id: 3,
    title: "Write docs",
    description: "Document the Swoff auth pattern.",
    status: "todo",
    createdAt: "2025-01-03T00:00:00.000Z",
    updatedAt: "2025-01-03T00:00:00.000Z",
    userId: 1,
  },
];

let nextNoteId = 3;
let nextTodoId = 4;

const users = [
  {
    id: 1,
    email: "demo@swoff.dev",
    name: "Demo User",
    password: "password123",
  },
];
const refreshTokens = new Set();

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "1h",
  });
}

function generateRefreshToken() {
  const token = crypto.randomUUID();
  refreshTokens.add(token);
  return token;
}

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  console.log(req.url, auth);
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

// --- Auth routes ---

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = generateToken(user);
  const refreshToken = generateRefreshToken();
  res.json({
    token,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
    expiresAt: Date.now() + 3600000,
  });
});

app.post("/api/register", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: "Missing fields" });
  if (users.find((u) => u.email === email))
    return res.status(409).json({ error: "Email already registered" });

  const id = users.length + 1;
  const user = { id, email, name, password };
  users.push(user);

  const token = generateToken(user);
  const refreshToken = generateRefreshToken();
  res.status(201).json({
    token,
    refreshToken,
    user: { id, email, name },
    expiresAt: Date.now() + 3600000,
  });
});

app.post("/api/refresh", authenticate, (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
  refreshTokens.delete(refreshToken);
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(401).json({ error: "User not found" });
  const newToken = generateToken(user);
  const newRefreshToken = generateRefreshToken();
  res.json({
    token: newToken,
    refreshToken: newRefreshToken,
    expiresAt: Date.now() + 3600000,
  });
});

app.post("/api/logout", authenticate, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) refreshTokens.delete(refreshToken);
  res.json({ ok: true });
});

app.get("/api/me", authenticate, (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, email: user.email, name: user.name });
});

// --- Protected CRUD: Notes ---

app.get("/api/notes", authenticate, (req, res) => {
  const userNotes = notes.filter((n) => n.userId === req.user.id);
  res.json(userNotes);
});

app.get("/api/notes/:id", authenticate, (req, res) => {
  const note = notes.find(
    (n) => n.id === Number(req.params.id) && n.userId === req.user.id,
  );
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
});

app.post("/api/notes", authenticate, (req, res) => {
  const { title, description, priority = "medium" } = req.body;
  if (!title || !description)
    return res.status(400).json({ error: "Missing required fields" });
  const now = new Date().toISOString();
  const note = {
    id: nextNoteId++,
    title,
    description,
    priority,
    createdAt: now,
    updatedAt: now,
    userId: req.user.id,
  };
  notes.push(note);
  res.status(201).json(note);
});

app.put("/api/notes/:id", authenticate, (req, res) => {
  const idx = notes.findIndex(
    (n) => n.id === Number(req.params.id) && n.userId === req.user.id,
  );
  if (idx === -1) return res.status(404).json({ error: "Note not found" });
  const { title, description, priority } = req.body;
  notes[idx] = {
    ...notes[idx],
    ...(title && { title }),
    ...(description && { description }),
    ...(priority && { priority }),
    updatedAt: new Date().toISOString(),
  };
  res.json(notes[idx]);
});

app.delete("/api/notes/:id", authenticate, (req, res) => {
  const idx = notes.findIndex(
    (n) => n.id === Number(req.params.id) && n.userId === req.user.id,
  );
  if (idx === -1) return res.status(404).json({ error: "Note not found" });
  notes.splice(idx, 1);
  res.status(204).end();
});

// --- Protected CRUD: Todos ---

app.get("/api/todos", authenticate, (req, res) => {
  const userTodos = todos.filter((t) => t.userId === req.user.id);
  res.json(userTodos);
});

app.get("/api/todos/:id", authenticate, (req, res) => {
  const todo = todos.find(
    (t) => t.id === Number(req.params.id) && t.userId === req.user.id,
  );
  if (!todo) return res.status(404).json({ error: "Todo not found" });
  res.json(todo);
});

app.post("/api/todos", authenticate, (req, res) => {
  const { title, description, status = "todo" } = req.body;
  if (!title || !description)
    return res.status(400).json({ error: "Missing required fields" });
  const now = new Date().toISOString();
  const todo = {
    id: nextTodoId++,
    title,
    description,
    status,
    createdAt: now,
    updatedAt: now,
    userId: req.user.id,
  };
  todos.push(todo);
  res.status(201).json(todo);
});

app.put("/api/todos/:id", authenticate, (req, res) => {
  const idx = todos.findIndex(
    (t) => t.id === Number(req.params.id) && t.userId === req.user.id,
  );
  if (idx === -1) return res.status(404).json({ error: "Todo not found" });
  const { title, description, status } = req.body;
  todos[idx] = {
    ...todos[idx],
    ...(title && { title }),
    ...(description && { description }),
    ...(status && { status }),
    updatedAt: new Date().toISOString(),
  };
  res.json(todos[idx]);
});

app.delete("/api/todos/:id", authenticate, (req, res) => {
  const idx = todos.findIndex(
    (t) => t.id === Number(req.params.id) && t.userId === req.user.id,
  );
  if (idx === -1) return res.status(404).json({ error: "Todo not found" });
  todos.splice(idx, 1);
  res.status(204).end();
});

// --- Serve static files in production ---
const distPath = new URL("./dist", import.meta.url).pathname;
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/{*path}", (req, res) => {
    res.sendFile(distPath + "/index.html");
  });
}

app.listen(PORT, () => {
  console.log(`Swoff demo API running at http://localhost:${PORT}`);
  console.log(`Demo login: demo@swoff.dev / password123`);
});
