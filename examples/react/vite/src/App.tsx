import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import GlobalLoadingBar from "./components/GlobalLoadingBar";
import NetworkStatusBanner from "./components/NetworkStatusBanner";
import SWProgressBar from "./components/SWProgressBar";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotesListPage from "./pages/NotesListPage";
import NotesDetailPage from "./pages/NotesDetailPage";
import NotesCreatePage from "./pages/NotesCreatePage";
import NotesEditPage from "./pages/NotesEditPage";
import NotesGqlPage from "./pages/NotesGqlPage";
import AboutPage from "./pages/AboutPage";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
      <GlobalLoadingBar />
      <SWProgressBar />
      <NetworkStatusBanner />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/notes" element={<ProtectedRoute><NotesListPage /></ProtectedRoute>} />
          <Route path="/notes/new" element={<ProtectedRoute><NotesCreatePage /></ProtectedRoute>} />
          <Route path="/notes/gql" element={<ProtectedRoute><NotesGqlPage /></ProtectedRoute>} />
          <Route path="/notes/:id" element={
            <ProtectedRoute>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" /></div>}>
                <NotesDetailPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/notes/:id/edit" element={<ProtectedRoute><NotesEditPage /></ProtectedRoute>} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
