import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';


import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BikeList from './pages/BikeList';
import BikeDetails from './pages/BikeDetails';
import CreateBike from './pages/CreateBike';
import MyBookings from './pages/MyBookings';
import BookingDetails from './pages/BookingDetails';
import OwnerBookings from './pages/OwnerBookings';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';


const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'customer') {
      return <Navigate to="/profile" replace />;
    } else if (user.role === 'owner') {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="min-h-screen bg-white">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'customer']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/bikes" element={<BikeList />} />
              <Route path="/bikes/:id" element={<BikeDetails />} />
              <Route
                path="/bikes/create"
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <CreateBike />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <MyBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner/bookings"
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <OwnerBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings/:id"
                element={
                  <ProtectedRoute>
                    <BookingDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#fff',
                  color: '#262626',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
                success: {
                  iconTheme: {
                    primary: '#16a34a',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#f97316',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </NotificationProvider>

    </AuthProvider >
  );
}

export default App;

