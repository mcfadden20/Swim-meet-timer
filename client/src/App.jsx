import { Routes, Route } from 'react-router-dom';
import TimerApp from './components/TimerApp';
import AdminDashboard from './components/AdminDashboard';
import AdminMaestro from './components/AdminMaestro';
import OfficialsMode from './components/OfficialsMode';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<TimerApp />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/maestro" element={<AdminMaestro />} />
      <Route path="/official" element={<OfficialsMode />} />
    </Routes>
  );
}

export default App
