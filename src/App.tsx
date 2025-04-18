import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAuthStore } from './store/authStore';
import { AuthGuard } from './components/AuthGuard';
import { Sidebar } from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Setup from './pages/Setup';
import Investments from './pages/Investments';
import Movements from './pages/Movements';

function App() {
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser({ id: user.uid, email: user.email! });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [setUser]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <div className="min-h-screen bg-gray-50">
                <Sidebar />
                <main className="pt-6">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/movements" element={<Movements />} />
                    <Route path="/setup" element={<Setup />} />
                    <Route path="/investments" element={<Investments />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </AuthGuard>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;