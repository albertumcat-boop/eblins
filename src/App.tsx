import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import AdminLayout from '@/components/layout/AdminLayout'
import RepresentativeLayout from '@/components/layout/RepresentativeLayout'
import TeacherLayout from '@/components/layout/TeacherLayout'
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminPayments from '@/pages/admin/Payments'
import AdminStudents from '@/pages/admin/Students'
import AdminUsers from '@/pages/admin/Users'
import AdminReports from '@/pages/admin/Reports'
import AdminMessages from '@/pages/admin/Messages'
import AdminSettings from '@/pages/admin/Settings'
import RepDashboard from '@/pages/representative/Dashboard'
import RepPayments from '@/pages/representative/Payments'
import RepAnnouncements from '@/pages/representative/Announcements'
import RepMessages from '@/pages/representative/Messages'
import RepStudentDetail from '@/pages/representative/StudentDetail'
import RepProfile from '@/pages/representative/Profile'
import TeacherDashboard from '@/pages/teacher/Dashboard'
import TeacherAnnouncements from '@/pages/teacher/Announcements'
import TeacherStudents from '@/pages/teacher/Students'
import TeacherGrades from '@/pages/teacher/Grades'
import RepGrades from '@/pages/representative/Grades'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 120_000 } } })

function AppRoutes() {
  const { appUser, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!appUser) return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )

  if (appUser.role === 'admin') return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )

  if (appUser.role === 'representative') return (
    <Routes>
      <Route path="/" element={<RepresentativeLayout />}>
        <Route index element={<RepDashboard />} />
        <Route path="payments" element={<RepPayments />} />
        <Route path="student/:id" element={<RepStudentDetail />} />
        <Route path="announcements" element={<RepAnnouncements />} />
        <Route path="messages" element={<RepMessages />} />
        <Route path="profile" element={<RepProfile />} />
        <Route path="grades" element={<RepGrades />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )

  return (
    <Routes>
      <Route path="/" element={<TeacherLayout />}>
        <Route index element={<TeacherDashboard />} />
        <Route path="announcements" element={<TeacherAnnouncements />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="grades" element={<TeacherGrades />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
