export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">About Swoff Demo</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400 leading-relaxed">
          This demo app showcases how to build an offline-first PWA using{" "}
          <a href="https://swoff.dev" className="text-teal-600 underline hover:text-teal-700 dark:text-teal-400">Swoff</a>
          , a zero-dependency blueprint for versioned service workers with cache strategies, tag invalidation,
          and offline mutation queuing.
        </p>
        <p className="mb-6 text-gray-600 dark:text-gray-400 leading-relaxed">
          Browse Notes, create and edit them, then go offline — your changes are queued and
          sync automatically when the connection returns. The service worker caches API responses using
          <strong className="text-gray-900 dark:text-white"> network-first</strong> and purges stale entries
          via tag-based invalidation after every mutation.
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Tech Stack</h2>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>React 19 + Vite 8</li>
            <li>React Router v7</li>
            <li>Tailwind CSS v4</li>
            <li>Express + JWT (development API with auth)</li>
            <li>Swoff: network-first cache, tag invalidation, offline mutation queue, background sync, auth integration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
