import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { authenticatedFetch } from "../../swoff/auth/fetch";
import { generateTags, invalidateByMethod } from "../../swoff/invalidation-tags";
import { queueMutation } from "../../swoff/mutation-queue";
import TodoCard from "../components/TodoCard";
import { usePendingQueue } from "../hooks/usePendingQueue";
import { useMutationSync } from "../hooks/useMutationSync";

export default function TodosListPage() {
  const [todos, setTodos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { pendingCount } = usePendingQueue();

  const loadTodos = async () => {
    try {
      setIsLoading(true);
      const res = await authenticatedFetch("/api/todos", { tags: generateTags("/api/todos") });
      setTodos(await res.json());
    } catch { setTodos([]); }
    finally { setIsLoading(false); }
  };

  useMutationSync(loadTodos, "todos");
  useEffect(() => { loadTodos(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this todo?")) return;
    if (!navigator.onLine) {
      await queueMutation({ method: "DELETE", url: `/api/todos/${id}`, tags: generateTags(`/api/todos/${id}`) });
      return;
    }
    await authenticatedFetch(`/api/todos/${id}`, { method: "DELETE" });
    await invalidateByMethod("DELETE", `/api/todos/${id}`);
    await loadTodos();
  };

  const filtered = todos.filter(
    (t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           t.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">Todos</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Keep track of your tasks</p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search todos..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500" />
          </div>
          <Link to="/todos/new"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:-translate-y-0.5">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Todo
          </Link>
        </div>

        {pendingCount > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            Changes saved offline — syncing when connection restores
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((todo) => (
              <TodoCard
                key={todo.id} id={todo.id}
                title={todo.title} description={todo.description}
                status={todo.status} updatedAt={todo.updatedAt}
                detailUrl={`/todos/${todo.id}`} editUrl={`/todos/${todo.id}/edit`}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {searchQuery ? "No todos found" : "No todos yet"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? "Try a different search term" : "Create your first todo to get started"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
