import { BrowserRouter, Routes, Route } from 'react-router';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import StudentDashboard from './pages/StudentDashboard';
import Questionario from './pages/Questionario';
import QuestionarioPersonalidade from './pages/QuestionarioPersonalidade';
import Perfil from './pages/Perfil';
import Resultados from './pages/Resultados';
import CounselorDashboard from './pages/CounselorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminImport from './pages/AdminImport';
import { ProtectedRoute } from './components/ProtectedRoute';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/questionario"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <Questionario />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/questionario-personalidade"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <QuestionarioPersonalidade />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/perfil"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <Perfil />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/resultados"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <Resultados />
            </ProtectedRoute>
          }
        />
        <Route
          path="/counselor/*"
          element={
            <ProtectedRoute allowedRoles={['counselor']}>
              <CounselorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/import"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminImport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
