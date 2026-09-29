import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiCalendar } from 'react-icons/fi';
import { formatBookingDate, formatTime12Hour } from '../utils/dateUtils';

const OwnerBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await api.get('/api/bookings/owner');
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching owner bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'owner') {
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
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-neutral-900">Booking Requests</h1>

        {bookings.length === 0 ? (
          <div className="card text-center py-12">
            <FiCalendar className="text-6xl text-neutral-400 mx-auto mb-4" />
            <p className="text-xl text-neutral-600 mb-2">No booking requests yet</p>
            <p className="text-sm text-neutral-500">
              Requests appear here after customers accept the agreement and complete advance payment.
            </p>
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
                    <h3 className="text-xl font-semibold mb-1">
                      {booking.bike?.brand} {booking.bike?.model}
                    </h3>
                    <p className="text-neutral-600">Number: {booking.bike?.bikeNumber}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {booking.customer?.profileImage ? (
                        <img
                          src={booking.customer.profileImage}
                          alt={booking.customer.name}
                          className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500">
                          <span className="text-xs">No Img</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-neutral-800">
                          Customer: {booking.customer?.name}
                        </p>
                        <p className="text-sm text-neutral-600">
                          {booking.customer?.phone} | {booking.customer?.email}
                        </p>
                      </div>
                    </div>
                    <p className="text-neutral-600">
                      Time: {formatBookingDate(booking.startTime || booking.startDate)} ({formatTime12Hour(booking.startTimeStr, booking.startTime)} — {formatTime12Hour(booking.endTimeStr, booking.endTime)})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                    <p className="text-sm text-neutral-600 mt-2">
                      Owner decision: {booking.ownerDecision?.status || 'pending'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-neutral-200">
                  <span className="text-neutral-600">Total Amount:</span>
                  <span className="text-2xl font-bold text-primary-700">₹{booking.totalAmount}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerBookings;

