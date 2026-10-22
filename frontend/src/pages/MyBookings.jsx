import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiCalendar, FiClock, FiMapPin } from 'react-icons/fi';
import { formatBookingDate, formatTime12Hour } from '../utils/dateUtils';

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await api.get('/api/bookings/customer');
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'customer') {
      fetchBookings();
    }
  }, [user, fetchBookings]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-primary-100 text-primary-800';
      case 'ongoing':
        return 'bg-accent-100 text-accent-800';
      case 'completed':
        return 'bg-neutral-100 text-neutral-800';
      case 'cancelled':
        return 'bg-neutral-200 text-neutral-600';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-neutral-900">My Bookings</h1>

        {bookings.length === 0 ? (
          <div className="card text-center py-12">
            <FiCalendar className="text-6xl text-neutral-400 mx-auto mb-4" />
            <p className="text-xl text-neutral-600 mb-4">No bookings yet</p>
            <Link to="/bikes" className="btn-primary inline-block">
              Browse Bikes
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Link
                key={booking._id}
                to={`/bookings/${booking._id}`}
                className="card hover:shadow-xl transition-shadow block"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {booking.bike?.brand} {booking.bike?.model}
                    </h3>
                    <p className="text-neutral-600">Number: {booking.bike?.bikeNumber}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-neutral-600">
                  <div className="flex items-center gap-2">
                    <FiClock />
                    <span>
                      {formatBookingDate(booking.startTime || booking.startDate)} ({formatTime12Hour(booking.startTimeStr, booking.startTime)} — {formatTime12Hour(booking.endTimeStr, booking.endTime)})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiMapPin />
                    <span>{booking.handoverLocation?.address || 'Location TBD'}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Total Amount:</span>
                    <span className="text-2xl font-bold text-primary-700">₹{booking.totalAmount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;

