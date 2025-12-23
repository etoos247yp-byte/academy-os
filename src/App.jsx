import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StudentProvider, useStudent } from './contexts/StudentContext';
import { AdminRoute, SuperAdminRoute, StudentRoute } from './components/common/ProtectedRoute';
import { StudentHeader, AdminHeader } from './components/common/Header';

// Pages
import StudentLogin from './pages/StudentLogin';
import AdminLogin from './pages/AdminLogin';

// Student Components
import EnrollmentPage from './components/student/EnrollmentPage';
import MySchedulePage from './components/student/MySchedulePage';
import NotificationsPage from './components/student/NotificationsPage';
import MyAttendancePage from './components/student/MyAttendancePage';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import StudentManagement from './components/admin/StudentManagement';
import CourseManagement from './components/admin/CourseManagement';
import SeasonManagement from './components/admin/SeasonManagement';
import EnrollmentRequests from './components/admin/EnrollmentRequests';
import AdminSettings from './components/admin/AdminSettings';
import ArchiveViewer from './components/admin/ArchiveViewer';
import ClassManagement from './components/admin/ClassManagement';
import AttendancePage from './components/admin/AttendancePage';

// Layout Components
function StudentLayout({ children }) {
  const { student, logoutStudent } = useStudent();
  
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <StudentHeader student={student} onLogout={logoutStudent} />
      {children}
    </div>
  );
}

function AdminLayout({ children }) {
  const { admin, logoutAdmin } = useAuth();
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <AdminHeader admin={admin} onLogout={logoutAdmin} />
      {children}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StudentProvider>
          <Routes>
            {/* Student Routes */}
            <Route path="/" element={<StudentLogin />} />
            <Route
              path="/student/courses"
              element={
                <StudentRoute>
                  <StudentLayout>
                    <EnrollmentPage />
                  </StudentLayout>
                </StudentRoute>
              }
            />
            <Route
              path="/student/schedule"
              element={
                <StudentRoute>
                  <StudentLayout>
                    <MySchedulePage />
                  </StudentLayout>
                </StudentRoute>
              }
            />
            <Route
              path="/student/notifications"
              element={
                <StudentRoute>
                  <StudentLayout>
                    <NotificationsPage />
                  </StudentLayout>
                </StudentRoute>
              }
            />
            <Route
              path="/student/attendance"
              element={
                <StudentRoute>
                  <StudentLayout>
                    <MyAttendancePage />
                  </StudentLayout>
                </StudentRoute>
              }
            />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/students"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <StudentManagement />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <CourseManagement />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/seasons"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <SeasonManagement />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/requests"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <EnrollmentRequests />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <SuperAdminRoute>
                  <AdminLayout>
                    <AdminSettings />
                  </AdminLayout>
                </SuperAdminRoute>
              }
            />
            <Route
              path="/admin/archive"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <ArchiveViewer />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/classes"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <ClassManagement />
                  </AdminLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/attendance"
              element={
                <AdminRoute>
                  <AdminLayout>
                    <AttendancePage />
                  </AdminLayout>
                </AdminRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </StudentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
