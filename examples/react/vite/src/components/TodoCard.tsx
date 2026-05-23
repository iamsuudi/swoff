import { Link } from "react-router-dom";

const statusColors: Record<string, string> = {
  "todo": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "done": "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
};

interface TodoCardProps {
  id: number;
  title: string;
  description: string;
  status: string;
  updatedAt: string;
  detailUrl: string;
  editUrl: string;
  onDelete?: (id: number) => void;
}

export default function TodoCard({ id, title, description, status, updatedAt, detailUrl, editUrl, onDelete }: TodoCardProps) {
  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-start justify-between gap-3">
        <Link to={detailUrl} className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 dark:text-white">{title}</h3>
        </Link>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[status] || statusColors["todo"]}`}>
          {status}
        </span>
      </div>
      <Link to={detailUrl} className="flex-1">
        <p className="text-sm text-gray-500 line-clamp-3 dark:text-gray-400">{description}</p>
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">{new Date(updatedAt).toLocaleDateString()}</span>
        <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
          <Link to={editUrl} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </Link>
          {onDelete && (
            <button onClick={() => onDelete(id)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
