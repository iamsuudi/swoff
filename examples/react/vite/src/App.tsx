import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
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
      <SWProgressBar />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/notes" element={<ProtectedRoute><NotesListPage /></ProtectedRoute>} />
          <Route path="/notes/new" element={<ProtectedRoute><NotesCreatePage /></ProtectedRoute>} />
          <Route path="/notes/gql" element={<ProtectedRoute><NotesGqlPage /></ProtectedRoute>} />
          <Route path="/notes/:id" element={<ProtectedRoute><NotesDetailPage /></ProtectedRoute>} />
          <Route path="/notes/:id/edit" element={<ProtectedRoute><NotesEditPage /></ProtectedRoute>} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
