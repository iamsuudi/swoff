import { buildSchema, graphql } from "graphql";

const schema = buildSchema(`
  type User {
    id: Int
    email: String
    name: String
  }

  type Note {
    id: Int
    title: String
    description: String
    priority: String
    createdAt: String
    updatedAt: String
    userId: Int
  }

  type Query {
    me: User
    notes: [Note]
    note(id: Int!): Note
  }

  type Mutation {
    createNote(title: String!, description: String!, priority: String): Note
    updateNote(id: Int!, title: String, description: String, priority: String): Note
    deleteNote(id: Int!): Boolean
  }
`);

const NOT_FOUND = "Note not found";
const MISSING = "Missing required fields";

export function setupGraphql(app, readDb, writeDb, authenticate, onMutation) {
  app.post("/graphql", authenticate, async (req, res) => {
    const { query, variables } = req.body || {};

    const rootValue = {
      me: () => {
        const db = readDb();
        const user = db.users.find((u) => u.id === req.user.id);
        return user ? { id: user.id, email: user.email, name: user.name } : null;
      },
      notes: () => {
        const db = readDb();
        return db.notes.filter((n) => n.userId === req.user.id);
      },
      note: ({ id }) => {
        const db = readDb();
        return db.notes.find((n) => n.id === id && n.userId === req.user.id) || null;
      },
      createNote: ({ title, description, priority }) => {
        if (!title || !description) throw new Error(MISSING);
        const db = readDb();
        const now = new Date().toISOString();
        const note = {
          id: db.nextNoteId++, title, description, priority: priority || "medium",
          createdAt: now, updatedAt: now, userId: req.user.id,
        };
        db.notes.push(note);
        writeDb(db);
        onMutation?.({ title: "Note created", body: `"${title}" added` });
        return note;
      },
      updateNote: ({ id, title, description, priority }) => {
        const db = readDb();
        const idx = db.notes.findIndex((n) => n.id === id && n.userId === req.user.id);
        if (idx === -1) throw new Error(NOT_FOUND);
        db.notes[idx] = {
          ...db.notes[idx],
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(priority !== undefined && { priority }),
          updatedAt: new Date().toISOString(),
        };
        writeDb(db);
        const updated = db.notes[idx];
        onMutation?.({ title: "Note updated", body: `"${updated.title}" updated` });
        return updated;
      },
      deleteNote: ({ id }) => {
        const db = readDb();
        const idx = db.notes.findIndex((n) => n.id === id && n.userId === req.user.id);
        if (idx === -1) throw new Error(NOT_FOUND);
        const deleted = db.notes[idx];
        db.notes.splice(idx, 1);
        writeDb(db);
        onMutation?.({ title: "Note deleted", body: `"${deleted.title}" removed` });
        return true;
      },
    };

    try {
      const result = await graphql({ schema, source: query, variableValues: variables, rootValue });
      res.json(result);
    } catch (err) {
      res.status(500).json({ errors: [{ message: err.message }] });
    }
  });
}
