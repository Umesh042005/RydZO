import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiActivity } from 'react-icons/fi';

import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import AdminStatCards from '../components/admin/AdminStatCards';
import AdminBookingCharts from '../components/admin/AdminBookingCharts';
import AdminRecentBikesTable from '../components/admin/AdminRecentBikesTable';
import AdminEntityDetailModal from '../components/admin/AdminEntityDetailModal';

const AdminPanel = () => {
  // State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [pendingApprovals, setPendingApprovals] = useState({
    customers: [],
    owners: [],
    bikes: []
  });
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminBikes, setAdminBikes] = useState([]);
  const [liveRentals, setLiveRentals] = useState([]);
  const [adminCustomers, setAdminCustomers] = useState([]);
  const [adminOwners, setAdminOwners] = useState([]);
  const [loadingTabData, setLoadingTabData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  // Detail Modal State for Pending Review / Entity Info
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'bike', // 'customer' | 'owner' | 'bike'
    data: null
  });

  // Filter state for Bookings tab
  const [bookingFilters, setBookingFilters] = useState({
    status: '',
    sentToOwner: '',
    ownerDecisionStatus: '',
    agreementAccepted: '',
    advancePaymentStatus: '',
    securityDepositStatus: ''
  });

  const navigate = useNavigate();

  const handleOpenBookingDetails = (bookingId) => {
    if (!bookingId) return;
    navigate(`/bookings/${bookingId}`);
  };

  const toggleExpanded = (key) => {
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatDateTime = (value, timeStr) => {
    if (!value && !timeStr) return '—';
    try {
      const d = value ? new Date(value) : null;
      let datePart = '';
      if (d && !isNaN(d.getTime())) {
        datePart = d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
      let timePart = '';
      if (timeStr && typeof timeStr === 'string' && timeStr.trim()) {
        const trimmed = timeStr.trim();
        if (/am|pm/i.test(trimmed)) {
          timePart = trimmed;
        } else {
          const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
          if (match) {
            let h = parseInt(match[1], 10);
            const m = match[2];
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            timePart = `${String(h).padStart(2, '0')}:${m} ${ampm}`;
          } else {
            timePart = trimmed;
          }
        }
      } else if (d && !isNaN(d.getTime())) {
        timePart = d.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
      if (datePart && timePart) return `${datePart}, ${timePart}`;
      return datePart || timePart || '—';
    } catch {
      return String(value || timeStr);
    }
  };

  // Fetch dashboard stats & pending approvals
  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, approvalsRes] = await Promise.all([
        api.get('/api/admin/dashboard'),
        api.get('/api/admin/pending-approvals')
      ]);
      setStats(statsRes.data || {});
      setPendingApprovals(approvalsRes.data || { customers: [], owners: [], bikes: [] });
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
    }
  }, []);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoadingTabData(true);
      const params = new URLSearchParams();
      Object.entries(bookingFilters).forEach(([k, v]) => {
        if (v !== '' && v != null) params.append(k, v);
      });
      const res = await api.get(`/api/admin/bookings?${params.toString()}`);
      setAdminBookings(res.data || []);
    } catch (error) {
      console.error('Error fetching admin bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoadingTabData(false);
    }
  }, [bookingFilters]);

  // Fetch bikes
  const fetchBikes = useCallback(async () => {
    try {
      setLoadingTabData(true);
      const res = await api.get('/api/admin/bikes');
      setAdminBikes(res.data || []);
    } catch (error) {
      console.error('Error fetching admin bikes:', error);
      toast.error('Failed to load bikes');
    } finally {
      setLoadingTabData(false);
    }
  }, []);

  // Fetch live rentals
  const fetchLiveRentals = useCallback(async () => {
    try {
      setLoadingTabData(true);
      const res = await api.get('/api/admin/live-rentals');
      setLiveRentals(res.data || []);
    } catch (error) {
      console.error('Error fetching live rentals:', error);
      toast.error('Failed to load live rentals');
    } finally {
      setLoadingTabData(false);
    }
  }, []);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoadingTabData(true);
      const res = await api.get('/api/admin/customers');
      setAdminCustomers(res.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoadingTabData(false);
    }
  }, []);

  // Fetch owners
  const fetchOwners = useCallback(async () => {
    try {
      setLoadingTabData(true);
      const res = await api.get('/api/admin/owners');
      setAdminOwners(res.data || []);
    } catch (error) {
      console.error('Error fetching owners:', error);
      toast.error('Failed to load owners');
    } finally {
      setLoadingTabData(false);
    }
  }, []);

  // Initial load: fetch dashboard data, bikes, bookings, customers, owners for instant charts and search
  useEffect(() => {
    fetchDashboardData();
    fetchBikes();
    fetchBookings();
    fetchCustomers();
    fetchOwners();
    fetchLiveRentals();
  }, [fetchDashboardData, fetchBikes, fetchBookings, fetchCustomers, fetchOwners, fetchLiveRentals]);

  // Reload when tab changes if needed
  useEffect(() => {
    if (activeTab === 'bookings') fetchBookings();
    if (activeTab === 'bikes') fetchBikes();
    if (activeTab === 'live') fetchLiveRentals();
    if (activeTab === 'customers') fetchCustomers();
    if (activeTab === 'owners') fetchOwners();
  }, [activeTab, fetchBookings, fetchBikes, fetchLiveRentals, fetchCustomers, fetchOwners]);

  // Total pending count calculation
  const totalPendingCount = useMemo(() => {
    const fromApprovals =
      (pendingApprovals.customers?.length || 0) +
      (pendingApprovals.owners?.length || 0) +
      (pendingApprovals.bikes?.length || 0);

    const fromStats =
      (stats.pendingCustomers || 0) +
      (stats.pendingOwners || 0) +
      (stats.pendingBikes || 0);

    return Math.max(fromApprovals, fromStats);
  }, [pendingApprovals, stats]);

  // Approve action with local state update without page reload
  const handleApprove = async (type, id, note = '') => {
    try {
      const payload = { note, reason: note };
      if (type === 'customer') {
        await api.put(`/api/admin/customers/${id}/approve`, payload);
        setAdminCustomers((prev) =>
          prev.map((c) => (c._id === id ? { ...c, customerApprovalStatus: 'approved', isVerified: true, customerApprovalNote: note } : c))
        );
        setPendingApprovals((prev) => ({
          ...prev,
          customers: prev.customers.filter((c) => c._id !== id)
        }));
        setStats((prev) => ({
          ...prev,
          pendingCustomers: Math.max(0, (prev.pendingCustomers || 1) - 1)
        }));
      } else if (type === 'owner') {
        await api.put(`/api/admin/owners/${id}/approve`, payload);
        setAdminOwners((prev) =>
          prev.map((o) => (o._id === id ? { ...o, ownerApprovalStatus: 'approved', isVerified: true, ownerApprovalNote: note } : o))
        );
        setPendingApprovals((prev) => ({
          ...prev,
          owners: prev.owners.filter((o) => o._id !== id)
        }));
        setStats((prev) => ({
          ...prev,
          pendingOwners: Math.max(0, (prev.pendingOwners || 1) - 1)
        }));
      } else if (type === 'bike') {
        await api.put(`/api/admin/bikes/${id}/approve`, payload);
        setAdminBikes((prev) =>
          prev.map((b) => (b._id === id ? { ...b, approvalStatus: 'approved', isAvailable: true, approvalNote: note } : b))
        );
        setPendingApprovals((prev) => ({
          ...prev,
          bikes: prev.bikes.filter((b) => b._id !== id)
        }));
        setStats((prev) => ({
          ...prev,
          pendingBikes: Math.max(0, (prev.pendingBikes || 1) - 1),
          approvedBikes: (prev.approvedBikes || 0) + 1
        }));
      }

      // Optimistically update modalConfig.data if currently open
      setModalConfig((prev) => {
        if (!prev.isOpen || !prev.data || prev.data._id !== id) return prev;
        const updated = { ...prev.data };
        if (type === 'customer') {
          updated.customerApprovalStatus = 'approved';
          updated.isVerified = true;
          updated.customerApprovalNote = note;
        } else if (type === 'owner') {
          updated.ownerApprovalStatus = 'approved';
          updated.isVerified = true;
          updated.ownerApprovalNote = note;
        } else if (type === 'bike') {
          updated.approvalStatus = 'approved';
          updated.isAvailable = true;
          updated.approvalNote = note;
        }
        return { ...prev, data: updated };
      });

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} approved successfully`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve');
      throw error;
    }
  };

  // Reject action with local state update without page reload
  const handleReject = async (type, id, note) => {
    if (!note) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      const payload = { note, reason: note };
      if (type === 'customer') {
        await api.put(`/api/admin/customers/${id}/reject`, payload);
        setAdminCustomers((prev) =>
          prev.map((c) => (c._id === id ? { ...c, customerApprovalStatus: 'rejected', isVerified: false, customerApprovalNote: note } : c))
        );
        setPendingApprovals((prev) => ({
          ...prev,
          customers: prev.customers.filter((c) => c._id !== id)
        }));
        setStats((prev) => ({
          ...prev,
          pendingCustomers: Math.max(0, (prev.pendingCustomers || 1) - 1)
        }));
      } else if (type === 'owner') {
        await api.put(`/api/admin/owners/${id}/reject`, payload);
        setAdminOwners((prev) =>
          prev.map((o) => (o._id === id ? { ...o, ownerApprovalStatus: 'rejected', isVerified: false, ownerApprovalNote: note } : o))
        );
        setPendingApprovals((prev) => ({
          ...prev,
          owners: prev.owners.filter((o) => o._id !== id)
        }));
        setStats((prev) => ({
          ...prev,
          pendingOwners: Math.max(0, (prev.pendingOwners || 1) - 1)
        }));
      } else if (type === 'bike') {
        const prevBike = adminBikes.find((b) => b._id === id);
        const wasApproved = prevBike?.approvalStatus === 'approved';

        await api.put(`/api/admin/bikes/${id}/reject`, payload);
        setAdminBikes((prev) =>
          prev.map((b) => (b._id === id ? { ...b, approvalStatus: 'rejected', isAvailable: false, approvalNote: note } : b))
        );
        setPendingApprovals((prev) => ({
          ...prev,
          bikes: prev.bikes.filter((b) => b._id !== id)
        }));
        setStats((prev) => ({
          ...prev,
          pendingBikes: Math.max(0, (prev.pendingBikes || 1) - 1),
          approvedBikes: wasApproved ? Math.max(0, (prev.approvedBikes || 1) - 1) : prev.approvedBikes
        }));
      }

      // Optimistically update modalConfig.data if currently open
      setModalConfig((prev) => {
        if (!prev.isOpen || !prev.data || prev.data._id !== id) return prev;
        const updated = { ...prev.data };
        if (type === 'customer') {
          updated.customerApprovalStatus = 'rejected';
          updated.isVerified = false;
          updated.customerApprovalNote = note;
        } else if (type === 'owner') {
          updated.ownerApprovalStatus = 'rejected';
          updated.isVerified = false;
          updated.ownerApprovalNote = note;
        } else if (type === 'bike') {
          updated.approvalStatus = 'rejected';
          updated.isAvailable = false;
          updated.approvalNote = note;
        }
        return { ...prev, data: updated };
      });

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} rejection updated`);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject');
      throw error;
    }
  };

  // Open detail modal helper
  const handleOpenDetail = (type, entity) => {
    setModalConfig({
      isOpen: true,
      type,
      data: entity
    });
  };

  const handleCloseModal = () => {
    setModalConfig({
      isOpen: false,
      type: 'bike',
      data: null
    });
  };

  return (
    <div className="flex min-h-screen bg-transparent text-neutral-900 font-sans antialiased">
      {/* 1. Left Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={totalPendingCount}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 2. Top Header Bar */}
        <AdminHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          bikes={adminBikes}
          customers={adminCustomers}
          owners={adminOwners}
          bookings={adminBookings}
          pendingCount={totalPendingCount}
          onSelectEntity={handleOpenDetail}
          setActiveTab={setActiveTab}
        />

        {/* Content Container */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Welcome & Quick Summary */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    Marketplace Dashboard
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                    Real-time performance metrics, fleet status, and booking analytics
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      fetchDashboardData();
                      fetchBikes();
                      fetchBookings();
                      toast.success('Dashboard data refreshed');
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-bold shadow-xs transition-colors"
                  >
                    <FiRefreshCw className="text-xs" />
                    <span>Refresh Data</span>
                  </button>
                </div>
              </div>

              {/* 3. 4 Stat Cards in a row */}
              <AdminStatCards
                stats={stats}
                customers={adminCustomers}
                owners={adminOwners}
                bikes={adminBikes}
                bookings={adminBookings}
                onCardClick={(tab) => setActiveTab(tab)}
              />

              {/* 4 & 5. Booking Status Overview (Horizontal Segmented Bar) + Total Bookings Donut Chart */}
              <AdminBookingCharts stats={stats} bookings={adminBookings} />

              {/* 6 & 7. Recent Bikes Table with Status Badges and Detail Modal */}
              <AdminRecentBikesTable
                bikes={adminBikes}
                onOpenDetail={handleOpenDetail}
                onApproveBike={(id) => handleApprove('bike', id)}
                onRejectBike={(id) => {
                  const targetBike = adminBikes.find((b) => b._id === id);
                  handleOpenDetail('bike', targetBike);
                }}
              />
            </div>
          )}

          {/* PENDING APPROVALS TAB */}
          {activeTab === 'approvals' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-neutral-900">Pending Approvals Queue</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Review and verify KYC documents and bike submissions before approving
                  </p>
                </div>
                <span className="px-3.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl">
                  {totalPendingCount} Items Pending
                </span>
              </div>

              {/* Pending Customers */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-sm">
                <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center justify-between">
                  <span>Pending Customers ({pendingApprovals.customers?.length || 0})</span>
                </h3>
                {pendingApprovals.customers?.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-4">No pending customer verifications.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingApprovals.customers.map((c) => (
                      <div
                        key={c._id}
                        className="p-4 rounded-xl border border-neutral-200 hover:border-primary-400 transition-colors bg-neutral-50/50 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-neutral-900 text-sm">{c.name}</p>
                              <p className="text-xs text-neutral-500">{c.phone} • {c.email}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              KYC Pending
                            </span>
                          </div>
                          <div className="mt-3 text-xs text-neutral-600 space-y-1">
                            <p>License: <span className="font-mono">{c.drivingLicense?.number || '—'}</span></p>
                            <p>Aadhaar: <span className="font-mono">{c.aadhaarNumber || '—'}</span></p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-200/60">
                          <button
                            onClick={() => handleOpenDetail('customer', c)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                          >
                            Inspect Docs
                          </button>
                          <button
                            onClick={() => handleApprove('customer', c._id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Owners */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-sm">
                <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center justify-between">
                  <span>Pending Owners ({pendingApprovals.owners?.length || 0})</span>
                </h3>
                {pendingApprovals.owners?.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-4">No pending owner verifications.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingApprovals.owners.map((o) => (
                      <div
                        key={o._id}
                        className="p-4 rounded-xl border border-neutral-200 hover:border-primary-400 transition-colors bg-neutral-50/50 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-neutral-900 text-sm">{o.name}</p>
                              <p className="text-xs text-neutral-500">{o.phone} • {o.email}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Owner Pending
                            </span>
                          </div>
                          <div className="mt-3 text-xs text-neutral-600 space-y-1">
                            <p>Aadhaar: <span className="font-mono">{o.aadhaarNumber || '—'}</span></p>
                            <p>PAN: <span className="font-mono">{o.panNumber || '—'}</span></p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-200/60">
                          <button
                            onClick={() => handleOpenDetail('owner', o)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                          >
                            Inspect Docs
                          </button>
                          <button
                            onClick={() => handleApprove('owner', o._id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Bikes */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-sm">
                <h3 className="text-base font-bold text-neutral-900 mb-4 flex items-center justify-between">
                  <span>Pending Bike Listings ({pendingApprovals.bikes?.length || 0})</span>
                </h3>
                {pendingApprovals.bikes?.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-4">No pending bike listings.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingApprovals.bikes.map((b) => (
                      <div
                        key={b._id}
                        className="p-4 rounded-xl border border-neutral-200 hover:border-primary-400 transition-colors bg-neutral-50/50 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-neutral-900 text-sm">{b.brand} {b.model}</p>
                              <p className="text-xs text-neutral-500 font-mono">{b.bikeNumber}</p>
                              <p className="text-xs text-neutral-500 mt-1">Owner: {b.owner?.name}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Bike Approval
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-bold text-neutral-900">₹{b.pricing?.daily}/day</p>
                        </div>
                        <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-200/60">
                          <button
                            onClick={() => handleOpenDetail('bike', b)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                          >
                            Inspect Bike & RC
                          </button>
                          <button
                            onClick={() => handleApprove('bike', b._id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ALL BOOKINGS TAB */}
          {activeTab === 'bookings' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">All Bookings Management</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Search, inspect, and filter system-wide bookings
                    </p>
                  </div>
                  <button
                    onClick={fetchBookings}
                    disabled={loadingTabData}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    {loadingTabData ? 'Refreshing...' : 'Apply Filters'}
                  </button>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <select
                    value={bookingFilters.status}
                    onChange={(e) => setBookingFilters((p) => ({ ...p, status: e.target.value }))}
                    className="p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Status: All</option>
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="ongoing">ongoing</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>

                  <select
                    value={bookingFilters.sentToOwner}
                    onChange={(e) => setBookingFilters((p) => ({ ...p, sentToOwner: e.target.value }))}
                    className="p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sent to Owner: All</option>
                    <option value="true">Sent (true)</option>
                    <option value="false">Draft (false)</option>
                  </select>

                  <select
                    value={bookingFilters.ownerDecisionStatus}
                    onChange={(e) => setBookingFilters((p) => ({ ...p, ownerDecisionStatus: e.target.value }))}
                    className="p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Owner Decision: All</option>
                    <option value="pending">pending</option>
                    <option value="accepted">accepted</option>
                    <option value="declined">declined</option>
                  </select>

                  <select
                    value={bookingFilters.agreementAccepted}
                    onChange={(e) => setBookingFilters((p) => ({ ...p, agreementAccepted: e.target.value }))}
                    className="p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Agreement: All</option>
                    <option value="true">Accepted</option>
                    <option value="false">Pending</option>
                  </select>

                  <select
                    value={bookingFilters.advancePaymentStatus}
                    onChange={(e) => setBookingFilters((p) => ({ ...p, advancePaymentStatus: e.target.value }))}
                    className="p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Advance: All</option>
                    <option value="pending">pending</option>
                    <option value="paid">paid</option>
                  </select>

                  <select
                    value={bookingFilters.securityDepositStatus}
                    onChange={(e) => setBookingFilters((p) => ({ ...p, securityDepositStatus: e.target.value }))}
                    className="p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Deposit: All</option>
                    <option value="pending">pending</option>
                    <option value="collected">collected</option>
                    <option value="refunded">refunded</option>
                  </select>
                </div>
              </div>

              {/* Bookings List */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-sm">
                {adminBookings.length === 0 ? (
                  <p className="text-center py-12 text-sm text-neutral-400">
                    No bookings found matching selected filters.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {adminBookings.map((b) => (
                      <div
                        key={b._id}
                        data-booking-id={b._id}
                        onClick={() => handleOpenBookingDetails(b._id)}
                        className="p-4 rounded-xl border border-neutral-200/80 hover:border-primary-300 hover:shadow-xs transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-bold text-neutral-900 text-sm group-hover:text-primary-700 transition-colors">
                                {b.bike?.brand} {b.bike?.model}
                              </p>
                              <span className="font-mono text-xs text-primary-800 bg-primary-50 px-2 py-0.5 rounded-md">
                                {b.bike?.bikeNumber}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-600">
                              Customer: <span className="font-semibold">{b.customer?.name}</span> ({b.customer?.phone}) • Owner: <span className="font-semibold">{b.owner?.name}</span>
                            </p>
                            <p className="text-xs text-neutral-500">
                              {formatDateTime(b.startTime, b.startTimeStr)} — {formatDateTime(b.endTime, b.endTimeStr)}
                            </p>
                            <p className="text-xs font-bold text-neutral-900">
                              Total: ₹{b.totalAmount} • Deposit: ₹{b.securityDeposit} • Advance: ₹{b.advancePayment?.requiredAmount || 0} ({b.advancePayment?.status || 'pending'})
                            </p>
                          </div>

                          <div className="text-right flex flex-col items-end space-y-2">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                b.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === 'ongoing'
                                  ? 'bg-cyan-100 text-cyan-800 animate-pulse'
                                  : b.status === 'completed'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : b.status === 'cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {b.status}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpanded(`booking:${b._id}`);
                                }}
                                className="text-xs text-neutral-500 hover:text-neutral-700 font-medium underline"
                              >
                                {expandedRows[`booking:${b._id}`] ? 'Hide Audit' : 'Audit'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenBookingDetails(b._id);
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                              >
                                View Details →
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {expandedRows[`booking:${b._id}`] && (
                          <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-600 bg-neutral-50/50 p-3 rounded-xl">
                            <div className="space-y-1.5">
                              <p><span className="font-semibold">Agreement Accepted:</span> {String(!!b.agreementAccepted)}</p>
                              <p><span className="font-semibold">Agreement Time:</span> {formatDateTime(b.agreementTimestamp)}</p>
                              <p><span className="font-semibold">Advance Txn ID:</span> {b.advancePayment?.transactionId || '—'}</p>
                              <p><span className="font-semibold">Advance Paid At:</span> {formatDateTime(b.advancePayment?.paidAt)}</p>
                              <p><span className="font-semibold">Owner Decision Note:</span> {b.ownerDecision?.note || '—'}</p>
                            </div>
                            <div className="space-y-1.5">
                              <p><span className="font-semibold">Deposit Status:</span> {b.securityDepositStatus || 'pending'}</p>
                              <p><span className="font-semibold">Handover Address:</span> {b.handoverLocation?.address || '—'}</p>
                              <p><span className="font-semibold">Actual Handover:</span> {formatDateTime(b.actualHandoverTime)}</p>
                              <p><span className="font-semibold">Actual Return:</span> {formatDateTime(b.actualReturnTime)}</p>
                              <p><span className="font-semibold">Payment Status:</span> {b.paymentStatus}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LIVE RIDES TAB */}
          {activeTab === 'live' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-neutral-900 flex items-center gap-2">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    Live Active Rentals
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Motorbikes currently dispatched and active on the road
                  </p>
                </div>
                <button
                  onClick={fetchLiveRentals}
                  className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50"
                >
                  Refresh Live
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-sm">
                {liveRentals.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400">
                    <FiActivity className="text-3xl mx-auto mb-2 text-neutral-300" />
                    <p className="text-sm">No ongoing rides in progress right now.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {liveRentals.map((r) => (
                      <div
                        key={r._id}
                        data-booking-id={r._id}
                        onClick={() => handleOpenBookingDetails(r._id)}
                        className="p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 space-y-3 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-900 text-sm group-hover:text-primary-700 transition-colors">
                            {r.bike?.brand} {r.bike?.model}
                          </span>
                          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            {r.bike?.bikeNumber}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-600 space-y-1">
                          <p>Customer: <span className="font-semibold text-neutral-800">{r.customer?.name}</span> ({r.customer?.phone})</p>
                          <p>Owner: <span className="font-semibold text-neutral-800">{r.owner?.name}</span> ({r.owner?.phone})</p>
                        </div>
                        <div className="pt-2 border-t border-emerald-100 text-xs text-neutral-500 flex justify-between">
                          <span>Started: {formatDateTime(r.actualHandoverTime)}</span>
                          <span>Scheduled Return: {formatDateTime(r.endTime)}</span>
                        </div>
                        <div className="pt-2 border-t border-emerald-100/80 flex items-center justify-between text-xs text-emerald-700 font-bold group-hover:text-emerald-900">
                          <span>View Booking & Agreement Details</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ALL BIKES TAB */}
          {activeTab === 'bikes' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-neutral-900">All Motorbikes Fleet</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Manage and inspect full bike inventory across owners
                  </p>
                </div>
                <button
                  onClick={fetchBikes}
                  className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50"
                >
                  Refresh Fleet
                </button>
              </div>

              <AdminRecentBikesTable
                bikes={adminBikes}
                onOpenDetail={handleOpenDetail}
                onApproveBike={(id) => handleApprove('bike', id)}
                onRejectBike={(id) => {
                  const targetBike = adminBikes.find((b) => b._id === id);
                  handleOpenDetail('bike', targetBike);
                }}
              />
            </div>
          )}

          {/* ALL CUSTOMERS TAB */}
          {activeTab === 'customers' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-neutral-900">All Customers Directory</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Inspect customer accounts, KYC documents, and rental histories
                  </p>
                </div>
                <button
                  onClick={fetchCustomers}
                  className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50"
                >
                  Refresh Customers
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/75 border-b border-neutral-200 text-[11px] uppercase tracking-wider text-neutral-500 font-bold">
                      <th className="py-3.5 px-4">#</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Phone / Email</th>
                      <th className="py-3.5 px-4">License No.</th>
                      <th className="py-3.5 px-4">KYC Status</th>
                      <th className="py-3.5 px-4">Registered</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-sm">
                    {adminCustomers.map((cust, idx) => (
                      <tr
                        key={cust._id}
                        onClick={() => handleOpenDetail('customer', cust)}
                        className="hover:bg-neutral-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 text-neutral-400 text-xs font-semibold">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-neutral-900">{cust.name}</td>
                        <td className="py-3.5 px-4 text-xs text-neutral-600">{cust.phone} • {cust.email}</td>
                        <td className="py-3.5 px-4 font-mono text-xs">{cust.drivingLicense?.number || '—'}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              cust.customerApprovalStatus === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cust.customerApprovalStatus === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {cust.customerApprovalStatus || 'pending'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-neutral-500">
                          {formatDateTime(cust.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail('customer', cust);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                          >
                            View Docs
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ALL OWNERS TAB */}
          {activeTab === 'owners' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-neutral-900">All Bike Owners Directory</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Inspect host partners, identity documents, and registered fleet
                  </p>
                </div>
                <button
                  onClick={fetchOwners}
                  className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50"
                >
                  Refresh Owners
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/75 border-b border-neutral-200 text-[11px] uppercase tracking-wider text-neutral-500 font-bold">
                      <th className="py-3.5 px-4">#</th>
                      <th className="py-3.5 px-4">Owner</th>
                      <th className="py-3.5 px-4">Phone / Email</th>
                      <th className="py-3.5 px-4">Aadhaar / PAN</th>
                      <th className="py-3.5 px-4">Approval Status</th>
                      <th className="py-3.5 px-4">Registered</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-sm">
                    {adminOwners.map((owner, idx) => (
                      <tr
                        key={owner._id}
                        onClick={() => handleOpenDetail('owner', owner)}
                        className="hover:bg-neutral-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 text-neutral-400 text-xs font-semibold">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-neutral-900">{owner.name}</td>
                        <td className="py-3.5 px-4 text-xs text-neutral-600">{owner.phone} • {owner.email}</td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {owner.aadhaarNumber ? `Aadhaar: ${owner.aadhaarNumber}` : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              owner.ownerApprovalStatus === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : owner.ownerApprovalStatus === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {owner.ownerApprovalStatus || 'pending'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-neutral-500">
                          {formatDateTime(owner.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail('owner', owner);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                          >
                            View Docs
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Interactive Entity Detail Modal (Customer, Owner, Bike) */}
      <AdminEntityDetailModal
        isOpen={modalConfig.isOpen}
        onClose={handleCloseModal}
        type={modalConfig.type}
        data={modalConfig.data}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
};

export default AdminPanel;
