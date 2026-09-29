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
    <nav className="bg-primary-800 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-3xl font-bold text-white bg-black rounded-lg px-8 py-2">
              RydZO
            </span>
          </Link>




          <div className="hidden md:flex items-center space-x-6">
            {/* Common Public/Customer Link */}
            {(user?.role === 'customer' || !user) && (
              <Link to="/bikes" className="text-white hover:text-primary-200 font-medium transition-colors">
                Rent Bikes
              </Link>
            )}

            {user ? (
              <>
                {/* Owner Links */}
                {user.role === 'owner' && (
                  <>
                    <Link to="/dashboard" className="text-white hover:text-primary-200 font-medium transition-colors">
                      Dashboard
                    </Link>
                    {/* Assuming Owner's "My Bikes" might be filtered list or dashboard bike list. Using /bikes/create for now as "Add Bike" was previous equivalent or maybe they mean manageable list */}
                    <Link to="/bikes/create" className="text-white hover:text-primary-200 font-medium transition-colors">
                      Browse Bikes
                    </Link>
                    <Link to="/owner/bookings" className="text-white hover:text-primary-200 font-medium transition-colors">
                      Bookings
                    </Link>
                  </>
                )}

                {/* Customer Links */}
                {user.role === 'customer' && (
                  <Link to="/bookings" className="text-white hover:text-primary-200 font-medium transition-colors">
                    My Bookings
                  </Link>
                )}

                {/* Admin Links */}
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-white hover:text-primary-200 font-medium transition-colors">
                    Admin Panel
                  </Link>
                )}

                <Link to="/profile" className="text-white hover:text-primary-200 font-medium transition-colors">
                  Profile
                </Link>


                {/* Notification Bell */}
                <div className="relative" ref={notificationRef}>
                  <button onClick={toggleNotifications} className="relative text-white hover:text-primary-200 p-2 focus:outline-none">
                    <FiBell size={24} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-primary-800">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-50 ring-1 ring-black ring-opacity-5">
                      <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
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
                              className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-blue-50' : 'bg-white'}`}
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
                <Link to="/login" className="text-white hover:text-primary-200 font-medium transition-colors">
                  Login
                </Link>
                <Link to="/register" className="bg-white text-primary-800 px-6 py-2 rounded-lg font-semibold hover:bg-primary-50 transition-colors duration-200">
                  Sign Up
                </Link>
              </>
            )}
          </div>


          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-primary-700 border-t border-primary-600">
          <div className="px-4 pt-2 pb-4 space-y-2">

            {/* Common Public/Customer Link - Mobile */}
            {(user?.role === 'customer' || !user) && (
              <Link
                to="/bikes"
                className="block px-4 py-2 text-white hover:bg-primary-600 rounded-lg"
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
                      className="block px-4 py-2 text-white hover:bg-primary-600 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/bikes/create"
                      className="block px-4 py-2 text-white hover:bg-primary-600 rounded-lg"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Bikes
                    </Link>
                    <Link
                      to="/owner/bookings"
                      className="block px-4 py-2 text-white hover:bg-primary-600 rounded-lg"
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
                    className="block px-4 py-2 text-white hover:bg-primary-600 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Bookings
                  </Link>
                )}

                {/* Admin Links - Mobile */}
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="block px-4 py-2 text-white hover:bg-primary-600 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Panel
                  </Link>
                )}

                <Link
                  to="/profile"
                  className="block px-4 py-2 text-white hover:bg-primary-600 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>

              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-2 text-white hover:bg-primary-600 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-2 bg-white text-primary-800 rounded-lg text-center font-semibold"
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
