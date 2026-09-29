import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { FiCheckCircle, FiClock } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingBikeId, setUpdatingBikeId] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user || user.role === 'admin') return;

    try {
      if (user.role === 'customer') {
        const response = await api.get('/api/users/customer/status');
        setStats(response.data);
      } else if (user.role === 'owner') {
        const response = await api.get('/api/users/owner/status');
        setStats(response.data);
        const bikesResponse = await api.get('/api/bikes/owner');
        setStats(prev => ({ ...prev, bikes: bikesResponse.data }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    fetchDashboardData();
  }, [user, navigate, fetchDashboardData]);

  const toggleBikeAvailability = async (bikeId, currentValue) => {
    try {
      setUpdatingBikeId(bikeId);
      await api.put(`/api/bikes/${bikeId}`, { isAvailable: !currentValue });
      await fetchDashboardData();
    } catch (error) {
      console.error('Error updating bike availability:', error);
    } finally {
      setUpdatingBikeId(null);
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
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-neutral-900">
          Welcome back, {user.name}!
        </h1>

        {user.role === 'customer' && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Verification Status</h3>
                {stats.canBook ? (
                  <FiCheckCircle className="text-primary-700 text-2xl" />
                ) : (
                  <FiClock className="text-accent-600 text-2xl" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-neutral-600">
                  Driving License: {stats.drivingLicenseUploaded ? '✓ Uploaded' : '✗ Not Uploaded'}
                  {stats.drivingLicenseVerified && ' (Verified)'}
                </p>
                <p className="text-neutral-600">
                  Selfie: {stats.selfieUploaded ? '✓ Uploaded' : '✗ Not Uploaded'}
                </p>
                <p className="text-neutral-600">
                  Approval: <span className={`font-semibold ${stats.approvalStatus === 'approved' ? 'text-primary-700' : stats.approvalStatus === 'rejected' ? 'text-accent-600' : 'text-neutral-500'}`}>
                    {stats.approvalStatus || 'Pending'}
                  </span>
                </p>
                {stats.approvalNote && (
                  <p className="text-sm text-neutral-500 mt-2">{stats.approvalNote}</p>
                )}
              </div>
              {!stats.canBook && (
                <Link to="/profile" className="btn-primary mt-4 inline-block">
                  Complete Verification
                </Link>
              )}
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link to="/bikes" className="block btn-primary text-center">
                  Browse Bikes
                </Link>
                <Link to="/bookings" className="block btn-secondary text-center">
                  My Bookings
                </Link>
              </div>
            </div>
          </div>
        )}

        {user.role === 'owner' && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Owner Status</h3>
                {stats.canListBike ? (
                  <FiCheckCircle className="text-primary-700 text-2xl" />
                ) : (
                  <FiClock className="text-accent-600 text-2xl" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-neutral-600">
                  Aadhaar: {stats.aadhaarUploaded ? '✓ Uploaded' : '✗ Not Uploaded'}
                </p>
                <p className="text-neutral-600">
                  PAN: {stats.panUploaded ? '✓ Uploaded' : '✗ Not Uploaded'}
                </p>
                <p className="text-neutral-600">
                  Approval: <span className={`font-semibold ${stats.approvalStatus === 'approved' ? 'text-primary-700' : stats.approvalStatus === 'rejected' ? 'text-accent-600' : 'text-neutral-500'}`}>
                    {stats.approvalStatus || 'Pending'}
                  </span>
                </p>
                {stats.approvalNote && (
                  <p className="text-sm text-neutral-500 mt-2">{stats.approvalNote}</p>
                )}
              </div>
              {!stats.canListBike && (
                <Link to="/profile" className="btn-primary mt-4 inline-block">
                  Complete Verification
                </Link>
              )}
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold mb-4">My Bikes</h3>
              <p className="text-neutral-600 mb-4">
                Total Listed: {stats.bikes?.length || 0}
              </p>
              <Link to="/bikes/create" className="btn-primary inline-block">
                List New Bike
              </Link>

              {stats.bikes?.length > 0 && (
                <div className="mt-6 border-t border-neutral-200 pt-4 space-y-3">
                  <p className="text-sm text-neutral-600">
                    Only bikes marked <span className="font-semibold">Available</span> (and approved) will show in Browse Bikes.
                  </p>
                  {stats.bikes.map((b) => (
                    <div key={b._id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-neutral-50">
                      <div>
                        <p className="font-semibold">{b.brand} {b.model}</p>
                        <p className="text-sm text-neutral-600">Number: {b.bikeNumber}</p>
                        <p className="text-sm text-neutral-600">Approval: {b.approvalStatus}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-neutral-600 mb-2">
                          Status: {
                            b.approvalStatus === 'pending' ? (
                              <span className="font-semibold text-yellow-600">Pending Approval</span>
                            ) : b.approvalStatus === 'rejected' ? (
                              <span className="font-semibold text-red-600">Rejected</span>
                            ) : (
                              <span className={`font-semibold ${b.isAvailable ? 'text-primary-700' : 'text-neutral-600'}`}>
                                {b.isAvailable ? 'Available' : 'Hidden'}
                              </span>
                            )
                          }
                        </p>
                        <button
                          onClick={() => toggleBikeAvailability(b._id, b.isAvailable)}
                          disabled={updatingBikeId === b._id || b.approvalStatus !== 'approved'}
                          className="btn-secondary disabled:opacity-50"
                        >
                          {updatingBikeId === b._id
                            ? 'Updating...'
                            : (b.isAvailable ? 'Hide from Browse' : 'Make Available')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;

