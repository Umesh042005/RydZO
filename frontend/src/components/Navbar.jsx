import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMenu, FiX, FiBell } from 'react-icons/fi';
// import { io } from 'socket.io-client';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotification();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    // Click outside handler
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNotifications = () => {
    if (!showNotifications) {
      fetchNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await markAsRead(notif._id);
      }
      if (notif.relatedId) {
        navigate(`/owner/bookings`); // Default to booking list
      }
      setShowNotifications(false);
    } catch (err) {
      console.error(err);
    }
  };



  return (
    <nav className="sticky top-0 z-50 bg-ink/70 backdrop-blur-xl border-b border-neutral-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-emerald-600 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <span className="font-display font-bold text-ink text-lg leading-none">R</span>
            </span>
            <span className="font-display text-2xl font-bold tracking-tight text-neutral-900">
              Ryd<span className="text-gradient">Zo</span>
            </span>
          </Link>




          <div className="hidden md:flex items-center space-x-6">
            {/* Common Public/Customer Link */}
            {(user?.role === 'customer' || !user) && (
              <Link to="/bikes" className="text-neutral-700 hover:text-primary-300 font-medium transition-colors">
                Rent Bikes
              </Link>
            )}

            {user ? (
              <>
                {/* Owner Links */}
                {user.role === 'owner' && (
                  <>
                    <Link to="/dashboard" className="text-neutral-700 hover:text-primary-300 font-medium transition-colors">
                      Dashboard
                    </Link>
                    {/* Assuming Owner's "My Bikes" might be filtered list or dashboard bike list. Using /bikes/create for now as "Add Bike" was previous equivalent or maybe they mean manageable list */}
                    <Link to="/bikes/create" className="text-neutral-700 hover:text-primary-300 font-medium transition-colors">
                      Browse Bikes
                    </Link>
                    <Link to="/owner/bookings" className="text-neutral-700 hover:text-primary-300 font-medium transition-colors">
                      Bookings
                    </Link>
                  </>
                )}

                {/* Customer Links */}
                {user.role === 'customer' && (
                  <Link to="/bookings" className="text-neutral-700 hover:text-primary-300 font-medium transition-colors">
                    My Bookings
                  </Link>
                )}

                {/* Admin Links */}
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-neutral-700 hover:text-primary-300 font-medium transition-colors">
                    Admin Panel
                  </Link>
                )}

                <Link to="/profile" className="text-neutral-700 hover:text-primary-300 font-medium transition-colors">
                  Profile
                </Link>


                {/* Notification Bell */}
                <div className="relative" ref={notificationRef}>
                  <button onClick={toggleNotifications} className="relative text-neutral-700 hover:text-primary-300 p-2 focus:outline-none">
                    <FiBell size={24} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-ink">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-card overflow-hidden z-50 border border-neutral-200">
                      <div className="p-3 border-b border-neutral-200 bg-neutral-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">Notifications</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllAsRead();
                          }}
                          className="text-xs text-primary-600 hover:text-primary-800"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                        ) : (
                          notifications.map(notif => (
                            <div
                              key={notif._id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3 border-b border-neutral-200 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-blue-50' : 'bg-white'}`}
                            >
                              <p className="text-sm text-gray-800">{notif.message}</p>
                              <p className="text-xs text-gray-500 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-neutral-700 hover:text-primary-300 font-medium transition-colors">
                  Login
                </Link>
                <Link to="/register" className="btn-primary !px-5 !py-2">
                  Sign Up
                </Link>
              </>
            )}
          </div>


          <button
            className="md:hidden text-neutral-900 p-2 -mr-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-neutral-200">
          <div className="px-4 pt-2 pb-4 space-y-2">

            {/* Common Public/Customer Link - Mobile */}
            {(user?.role === 'customer' || !user) && (
              <Link
                to="/bikes"
                className="block px-4 py-3 text-neutral-800 hover:bg-neutral-100 rounded-xl"
                onClick={() => setMobileMenuOpen(false)}
              >
                Rent Bikes
              </Link>
            )}

            {user ? (
              <>
                {/* Owner Links - Mobile */}
                {user.role === 'owner' && (
                  <>
                    <Link
                      to="/dashboard"
                      className="block px-4 py-3 text-neutral-800 hover:bg-neutral-100 rounded-xl"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/bikes/create"
                      className="block px-4 py-3 text-neutral-800 hover:bg-neutral-100 rounded-xl"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Bikes
                    </Link>
                    <Link
                      to="/owner/bookings"
                      className="block px-4 py-3 text-neutral-800 hover:bg-neutral-100 rounded-xl"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Bookings
                    </Link>
                  </>
                )}

                {/* Customer Links - Mobile */}
                {user.role === 'customer' && (
                  <Link
                    to="/bookings"
                    className="block px-4 py-3 text-neutral-800 hover:bg-neutral-100 rounded-xl"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Bookings
                  </Link>
                )}

                {/* Admin Links - Mobile */}
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="block px-4 py-3 text-neutral-800 hover:bg-neutral-100 rounded-xl"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Panel
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="block px-4 py-3 text-neutral-800 hover:bg-neutral-100 rounded-xl"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>

              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-3 text-neutral-800 hover:bg-neutral-100 rounded-xl"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary w-full !py-3"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
