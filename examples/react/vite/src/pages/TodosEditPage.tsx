import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../../swoff/auth/fetch";
import { generateTags, invalidateByMethod } from "../../swoff/invalidation-tags";
import { queueMutation } from "../../swoff/mutation-queue";
import TodoForm from "../components/TodoForm";

export default function TodosEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [todo, setTodo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setIsLoading(true);
        const res = await authenticatedFetch(`/api/todos/${id}`, { tags: generateTags(`/api/todos/${id}`) });
        setTodo(await res.json());
      } catch { setTodo(null); }
      finally { setIsLoading(false); }
    })();
  }, [id]);

  const handleSubmit = async (data: Record<string, string>) => {
    const body = { ...data, updatedAt: new Date().toISOString() };

    if (!navigator.onLine) {
      await queueMutation({ method: "PUT", url: `/api/todos/${id}`, body, tags: generateTags(`/api/todos/${id}`) });
      navigate(`/todos/${id}`);
      return;
    }

    await authenticatedFetch(`/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await invalidateByMethod("PUT", `/api/todos/${id}`);
    navigate(`/todos/${id}`);
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
          <Link to="/todos" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-teal-500 px-5 py-2 text-sm font-medium text-teal-600 transition hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/30">Back to Todos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link to={`/todos/${id}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Todo
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-700 dark:bg-gray-800">
          <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Edit Todo</h1>
          <TodoForm initialData={todo} onSubmit={handleSubmit} onCancel={() => navigate(`/todos/${id}`)} submitLabel="Update Todo" />
        </div>
      </div>
    </div>
  );
}
