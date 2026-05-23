import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../../swoff/auth-fetch";
import { generateTags, invalidateByMethod } from "../../swoff/invalidation-tags";
import { queueMutation } from "../../swoff/mutation-queue";

const statusColors: Record<string, string> = {
  "todo": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "done": "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
};

export default function TodosDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [todo, setTodo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTodo = async (todoId: number) => {
    try {
      setIsLoading(true);
      const res = await authenticatedFetch(`/api/todos/${todoId}`, { tags: generateTags(`/api/todos/${todoId}`) });
      setTodo(await res.json());
    } catch { setTodo(null); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { if (id) loadTodo(Number(id)); }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this todo?")) return;
    if (!navigator.onLine) {
      await queueMutation({ method: "DELETE", url: `/api/todos/${id}`, tags: generateTags(`/api/todos/${id}`) });
      navigate("/todos");
      return;
    }
    await authenticatedFetch(`/api/todos/${id}`, { method: "DELETE" });
    await invalidateByMethod("DELETE", `/api/todos/${id}`);
    navigate("/todos");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (!todo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Todo not found</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">This todo may have been deleted</p>
          <Link to="/todos" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-teal-500 px-5 py-2 text-sm font-medium text-teal-600 transition hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30">Back to Todos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/todos" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back
          </Link>
          <div className="flex items-center gap-2">
            <Link to={`/todos/${todo.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">Edit</Link>
            <button onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-red-900/30">Delete</button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h1 className="flex-1 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">{todo.title}</h1>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusColors[todo.status] || statusColors["todo"]}`}>{todo.status}</span>
          </div>
          <p className="whitespace-pre-wrap text-gray-600 leading-relaxed dark:text-gray-400">{todo.description}</p>
          <div className="mt-8 flex flex-wrap gap-4 border-t border-gray-200 pt-6 text-xs text-gray-400 dark:border-gray-700">
            <span>Created: {new Date(todo.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(todo.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
