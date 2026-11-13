import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import AuthModal from './components/AuthModal.jsx';
import RequireRole from './components/RequireRole.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Report from './pages/Report.jsx';
import MapPage from './pages/MapPage.jsx';
import Tenders from './pages/Tenders.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-[#f3f3f3] flex flex-col overflow-x-hidden font-sans">
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/report" element={<Report />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/tenders" element={<Tenders />} />
          <Route path="/admin" element={<RequireRole roles={['admin']}><Admin /></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <AuthModal />
    </div>
  );
}
