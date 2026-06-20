import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getAllNotes, getNoteById, createNote, updateNote, deleteNote } from "@/lib/repositories/notes";
import { broadcastInvalidation } from "@/utils/sse";
import { triggerPushNotification } from "@/utils/push";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id;

    const { query, variables } = await request.json();

    if (query?.includes("GetNotes")) {
      const notes = userId ? await getAllNotes(userId) : [];
      return Response.json({ data: { notes } });
    }

    if (query?.includes("GetNote")) {
      const id = variables?.id;
      const note = await getNoteById(id);
      if (!note) {
        return Response.json(
          { errors: [{ message: "Not found" }] },
          { status: 404 },
        );
      }
      return Response.json({ data: { note } });
    }

    if (query?.includes("CreateNote")) {
      if (!userId) {
        return Response.json(
          { errors: [{ message: "Unauthorized" }] },
          { status: 401 },
        );
      }
      const { title, description, priority } = variables || {};
      const newNote = await createNote({
        userId,
        title: title || "Untitled",
        description: description || "",
        priority: priority || "medium",
      });
      triggerPushNotification({
        title: "Note created",
        body: `"${newNote.title}" added`,
      }).catch(() => {});
      broadcastInvalidation(["notes"]);
      return Response.json({ data: { createNote: newNote } });
    }

    if (query?.includes("UpdateNote")) {
      if (!userId) {
        return Response.json(
          { errors: [{ message: "Unauthorized" }] },
          { status: 401 },
        );
      }
      const { id, title, description, priority } = variables || {};
      const updated = await updateNote(id, { title, description, priority });
      if (!updated) {
        return Response.json(
          { errors: [{ message: "Not found" }] },
          { status: 404 },
        );
      }
      triggerPushNotification({
        title: "Note updated",
        body: `"${updated.title}" updated`,
      }).catch(() => {});
      broadcastInvalidation(["notes"]);
      return Response.json({ data: { updateNote: updated } });
    }

    if (query?.includes("DeleteNote")) {
      if (!userId) {
        return Response.json(
          { errors: [{ message: "Unauthorized" }] },
          { status: 401 },
        );
      }
      const id = variables?.id;
      const note = await getNoteById(id);
      if (!note) {
        return Response.json(
          { errors: [{ message: "Not found" }] },
          { status: 404 },
        );
      }
      await deleteNote(id);
      triggerPushNotification({
        title: "Note deleted",
        body: `"${note.title}" removed`,
      }).catch(() => {});
      broadcastInvalidation(["notes"]);
      return Response.json({ data: { deleteNote: { id } } });
    }

    return Response.json(
      { errors: [{ message: "Unknown query" }] },
      { status: 400 },
    );
  } catch (err) {
    return Response.json(
      { errors: [{ message: String(err) }] },
      { status: 500 },
    );
  }
}
