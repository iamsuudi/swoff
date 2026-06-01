import express from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import webPush from "web-push";
import { setupPush, triggerPushNotification } from "./push.js";
import { setupGraphql } from "./graphql.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, "db.json");

export function readDb() {
  return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

export function writeDb(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function setupCommon(app, authenticate) {
  const sseClients = [];
  function broadcastInvalidation(tags) {
    const data = JSON.stringify({ tags });
    sseClients.forEach((client) => {
      client.write(`event: invalidate\ndata: ${data}\n\n`);
    });
  }

  app.get("/api/events", authenticate, (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("event: connected\ndata: {}\n\n");
    sseClients.push(res);
    req.on("close", () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
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
    const note = db.notes.find(
      (n) => n.id === Number(req.params.id) && n.userId === req.user.id,
    );
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(note);
  });

  app.post("/api/notes", authenticate, (req, res) => {
    const db = readDb();
    const { title, description, priority = "medium" } = req.body;
    if (!title || !description)
      return res.status(400).json({ error: "Missing required fields" });
    const now = new Date().toISOString();
    const note = {
      id: db.nextNoteId++,
      title,
      description,
      priority,
      createdAt: now,
      updatedAt: now,
      userId: req.user.id,
    };
    db.notes.push(note);
    writeDb(db);
    triggerPushNotification(readDb, writeDb, webPush, {
      title: "Note created",
      body: `"${title}" added`,
    }).catch(() => {});
    broadcastInvalidation(["notes"]);
    res.status(201).json(note);
  });

  app.put("/api/notes/:id", authenticate, (req, res) => {
    const db = readDb();
    const idx = db.notes.findIndex(
      (n) => n.id === Number(req.params.id) && n.userId === req.user.id,
    );
    if (idx === -1) return res.status(404).json({ error: "Note not found" });
    const { title, description, priority } = req.body;
    db.notes[idx] = {
      ...db.notes[idx],
      ...(title && { title }),
      ...(description && { description }),
      ...(priority && { priority }),
      updatedAt: new Date().toISOString(),
    };
    const updated = db.notes[idx];
    writeDb(db);
    triggerPushNotification(readDb, writeDb, webPush, {
      title: "Note updated",
      body: `"${updated.title}" updated`,
    }).catch(() => {});
    broadcastInvalidation(["notes"]);
    res.json(updated);
  });

  app.delete("/api/notes/:id", authenticate, (req, res) => {
    const db = readDb();
    const idx = db.notes.findIndex(
      (n) => n.id === Number(req.params.id) && n.userId === req.user.id,
    );
    if (idx === -1) return res.status(404).json({ error: "Note not found" });
    db.notes.splice(idx, 1);
    writeDb(db);
    triggerPushNotification(readDb, writeDb, webPush, {
      title: "Note deleted",
      body: `Note #${req.params.id} removed`,
    }).catch(() => {});
    broadcastInvalidation(["notes"]);
    res.status(204).end();
  });

  setupGraphql(app, readDb, writeDb, authenticate, (payload) => {
    triggerPushNotification(readDb, writeDb, webPush, payload).catch(() => {});
    broadcastInvalidation(["notes"]);
  });

  setupPush(app, readDb, writeDb, webPush);

  const distPath = join(__dirname, "..", "dist");
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("/{*path}", (req, res) => res.sendFile(distPath + "/index.html"));
  }
}
