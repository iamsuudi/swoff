export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">About Swoff Notes</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400 leading-relaxed">
          Swoff Notes is a demo application built with{" "}
          <a href="https://swoff.dev" className="text-teal-600 underline hover:text-teal-700 dark:text-teal-400">Swoff</a>,
          a zero-dependency blueprint for building offline-first, versioned web apps that feel native.
        </p>
        <p className="mb-6 text-gray-600 dark:text-gray-400 leading-relaxed">
          This app demonstrates how to integrate Swoff's service worker patterns — versioned SW updates with user consent,
          PWA installability, and offline support — into a React application.
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Tech Stack</h2>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>React 19 + Vite 8</li>
            <li>React Router v7</li>
            <li>Tailwind CSS v4</li>
            <li>json-server (development API)</li>
            <li>Swoff patterns (sw-template, sw-generator, sw-injector)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
