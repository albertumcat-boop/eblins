import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Landing from '@/pages/Landing'
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
import AdminAuditLog from '@/pages/admin/AuditLog'
import AdminCalendar from '@/pages/admin/Calendar'
import AdminMeetings from '@/pages/admin/Meetings'
import AdminSchedules from '@/pages/admin/Schedules'
import AdminSupplies from '@/pages/admin/Supplies'
import AdminImport from '@/pages/admin/Import'
import AdminStripeConfig from '@/pages/admin/StripeConfig'
import AdminEmailQueue from '@/pages/admin/EmailQueue'
import AdminLateNotices from '@/pages/admin/LateNotices'
import RepDashboard from '@/pages/representative/Dashboard'
import RepPayments from '@/pages/representative/Payments'
import RepAnnouncements from '@/pages/representative/Announcements'
import RepMessages from '@/pages/representative/Messages'
import RepStudentDetail from '@/pages/representative/StudentDetail'
import RepProfile from '@/pages/representative/Profile'
import RepGrades from '@/pages/representative/Grades'
import RepAttendance from '@/pages/representative/Attendance'
import RepBehavior from '@/pages/representative/Behavior'
import RepReportCards from '@/pages/representative/ReportCards'
import RepDocuments from '@/pages/representative/Documents'
import RepCalendar from '@/pages/representative/Calendar'
import RepTasks from '@/pages/representative/Tasks'
import RepSchedules from '@/pages/representative/Schedules'
import RepSupplies from '@/pages/representative/Supplies'
import RepMeetings from '@/pages/representative/Meetings'
import RepLateNotice from '@/pages/representative/LateNotice'
import TeacherDashboard from '@/pages/teacher/Dashboard'
import TeacherAnnouncements from '@/pages/teacher/Announcements'
import TeacherStudents from '@/pages/teacher/Students'
import TeacherGrades from '@/pages/teacher/Grades'
import TeacherAttendance from '@/pages/teacher/Attendance'
import TeacherBehavior from '@/pages/teacher/Behavior'
import TeacherReportCards from '@/pages/teacher/ReportCards'
import TeacherTasks from '@/pages/teacher/Tasks'
import TeacherSchedules from '@/pages/teacher/Schedules'
import Chat from '@/pages/Chat'
import InstallPrompt from '@/components/InstallPrompt'
import OnboardingWizard from '@/pages/onboarding/OnboardingWizard'
import PendingSchool from '@/pages/PendingSchool'
import NotFound from '@/pages/NotFound'
import SuperAdminPanel from '@/pages/superadmin/SuperAdminPanel'
import Legal from '@/pages/Legal'
import DemoSeeder from '@/pages/admin/DemoSeeder'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 120_000 } } })

function AppRoutes() {
  const { appUser, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  )
  if (!appUser) return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
  // Super-admin panel (accesible para el dueño del SaaS, sin importar el rol)
  if (appUser.email === 'albert.umcat@gmail.com') return (
    <Routes>
      <Route path="/superadmin" element={<SuperAdminPanel />} />
      <Route path="/demo-seeder" element={<DemoSeeder />} />
      <Route path="/legal" element={<Legal />} />
      {/* También puede acceder al panel de admin normal */}
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit" element={<AdminAuditLog />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="meetings" element={<AdminMeetings />} />
        <Route path="schedules" element={<AdminSchedules />} />
        <Route path="supplies" element={<AdminSupplies />} />
        <Route path="import" element={<AdminImport />} />
        <Route path="stripe-config" element={<AdminStripeConfig />} />
        <Route path="email-queue" element={<AdminEmailQueue />} />
        <Route path="late-notices" element={<AdminLateNotices />} />
        <Route path="chat" element={<Chat />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
  // Admin con escuela pendiente → redirigir a onboarding
  if (
    appUser.role === 'admin' &&
    (appUser.schoolId === 'pending' || appUser.schoolId === 'school_default')
  ) return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
    </Routes>
  )
  // Cuenta pendiente de asignación a escuela (no admin) — solo bloquear si NO está aprobado
  if (
    (appUser.schoolId === 'pending' || appUser.schoolId === 'school_default') &&
    appUser.role !== 'admin' &&
    appUser.status !== 'approved'
  ) return <PendingSchool />
  // Representante pendiente de aprobación por el admin
  if ((appUser.role === 'representative' || appUser.role === 'teacher') && appUser.status === 'pending_approval') return <PendingSchool />
  if (appUser.role === 'admin') return (
    <Routes>
      <Route path="/legal" element={<Legal />} />
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit" element={<AdminAuditLog />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="meetings" element={<AdminMeetings />} />
        <Route path="schedules" element={<AdminSchedules />} />
        <Route path="supplies" element={<AdminSupplies />} />
        <Route path="import" element={<AdminImport />} />
        <Route path="stripe-config" element={<AdminStripeConfig />} />
        <Route path="email-queue" element={<AdminEmailQueue />} />
        <Route path="late-notices" element={<AdminLateNotices />} />
        <Route path="chat" element={<Chat />} />
      </Route>
      <Route path="*" element={<NotFound />} />
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
        <Route path="attendance" element={<RepAttendance />} />
        <Route path="behavior" element={<RepBehavior />} />
        <Route path="reportcards" element={<RepReportCards />} />
        <Route path="documents" element={<RepDocuments />} />
        <Route path="calendar" element={<RepCalendar />} />
        <Route path="tasks" element={<RepTasks />} />
        <Route path="schedules" element={<RepSchedules />} />
        <Route path="supplies" element={<RepSupplies />} />
        <Route path="meetings" element={<RepMeetings />} />
        <Route path="late-notice" element={<RepLateNotice />} />
        <Route path="chat" element={<Chat />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
  return (
    <Routes>
      <Route path="/" element={<TeacherLayout />}>
        <Route index element={<TeacherDashboard />} />
        <Route path="announcements" element={<TeacherAnnouncements />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="grades" element={<TeacherGrades />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="behavior" element={<TeacherBehavior />} />
        <Route path="tasks" element={<TeacherTasks />} />
        <Route path="schedules" element={<TeacherSchedules />} />
        <Route path="reportcards" element={<TeacherReportCards />} />
        <Route path="chat" element={<Chat />} />
      </Route>
      <Route path="*" element={<NotFound />} />
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
          <InstallPrompt />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
