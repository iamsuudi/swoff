import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import UpdatePrompt from "./components/UpdatePrompt";
import SWProgressBar from "./components/SWProgressBar";
import HomePage from "./HomePage";
import NoteDetailPage from "./NoteDetailPage";
import NoteCreatePage from "./NoteCreatePage";
import NoteEditPage from "./NoteEditPage";
import AboutPage from "./AboutPage";

export default function App() {
  return (
    <>
      <SWProgressBar />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/notes/new" element={<NoteCreatePage />} />
          <Route path="/notes/:id" element={<NoteDetailPage />} />
          <Route path="/notes/:id/edit" element={<NoteEditPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>
      <UpdatePrompt />
    </>
  );
}
