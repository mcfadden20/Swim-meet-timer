import { Routes, Route } from 'react-router-dom';
import TimerApp from './components/TimerApp';
import AdminDashboard from './components/AdminDashboard';
import AdminMaestro from './components/AdminMaestro';

function App() {
  return (
    <Routes>
      <Route path="/" element={<TimerApp />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/maestro" element={<AdminMaestro />} />
    </Routes>
  );
}

export default App
