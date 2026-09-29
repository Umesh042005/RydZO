import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiBell, FiX, FiCheckCircle, FiUser, FiTruck, FiCalendar, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const AdminHeader = ({
  searchQuery,
  setSearchQuery,
  bikes = [],
  customers = [],
  owners = [],
  bookings = [],
  pendingCount = 0,
  onSelectEntity,
  setActiveTab
}) => {
  const { user } = useAuth();
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchContainerRef = useRef(null);
  const notifContainerRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter entities based on query
  const query = (searchQuery || '').trim().toLowerCase();
  const matchedBikes = query
    ? bikes.filter(
        (b) =>
          b.bikeNumber?.toLowerCase().includes(query) ||
          b.brand?.toLowerCase().includes(query) ||
          b.model?.toLowerCase().includes(query) ||
          b.owner?.name?.toLowerCase().includes(query)
      ).slice(0, 4)
    : [];

  const matchedCustomers = query
    ? customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query)
      ).slice(0, 4)
    : [];

  const matchedOwners = query
    ? owners.filter(
        (o) =>
          o.name?.toLowerCase().includes(query) ||
          o.phone?.toLowerCase().includes(query) ||
          o.email?.toLowerCase().includes(query)
      ).slice(0, 4)
    : [];

  const matchedBookings = query
    ? bookings.filter(
        (b) =>
          b._id?.toLowerCase().includes(query) ||
          b.customer?.name?.toLowerCase().includes(query) ||
          b.owner?.name?.toLowerCase().includes(query) ||
          b.bike?.model?.toLowerCase().includes(query) ||
          b.bike?.bikeNumber?.toLowerCase().includes(query)
      ).slice(0, 4)
    : [];

  const hasAnyMatches =
    matchedBikes.length > 0 ||
    matchedCustomers.length > 0 ||
    matchedOwners.length > 0 ||
    matchedBookings.length > 0;

  const getInitials = (name) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <header className="h-20 bg-white border-b border-neutral-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/95">
      {/* Global Search Input */}
      <div className="relative flex-1 max-w-xl" ref={searchContainerRef}>
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-lg pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search bikes, customers, owners, bookings..."
            className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white text-sm text-neutral-900 placeholder-neutral-400 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-inner/5"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
            >
              <FiX className="text-sm" />
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {showSearchResults && query && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-50 max-h-[480px] overflow-y-auto divide-y divide-neutral-100">
            {!hasAnyMatches ? (
              <div className="p-6 text-center text-sm text-neutral-500">
                No matching results found for "{searchQuery}"
              </div>
            ) : (
              <>
                {/* Bikes */}
                {matchedBikes.length > 0 && (
                  <div className="p-3">
                    <p className="px-3 py-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FiTruck className="text-primary-600" /> Bikes ({matchedBikes.length})
                    </p>
                    <div className="mt-1 space-y-1">
                      {matchedBikes.map((bike) => (
                        <div
                          key={bike._id}
                          onClick={() => {
                            setShowSearchResults(false);
                            if (onSelectEntity) onSelectEntity('bike', bike);
                            else setActiveTab('bikes');
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-primary-50/60 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">
                              {bike.brand} {bike.model}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {bike.bikeNumber} • Owner: {bike.owner?.name || 'Unknown'}
                            </p>
                          </div>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              bike.approvalStatus === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : bike.approvalStatus === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {bike.approvalStatus}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customers */}
                {matchedCustomers.length > 0 && (
                  <div className="p-3">
                    <p className="px-3 py-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FiUser className="text-emerald-600" /> Customers ({matchedCustomers.length})
                    </p>
                    <div className="mt-1 space-y-1">
                      {matchedCustomers.map((cust) => (
                        <div
                          key={cust._id}
                          onClick={() => {
                            setShowSearchResults(false);
                            if (onSelectEntity) onSelectEntity('customer', cust);
                            else setActiveTab('customers');
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">{cust.name}</p>
                            <p className="text-xs text-neutral-500">
                              {cust.phone} • {cust.email}
                            </p>
                          </div>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              cust.customerApprovalStatus === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cust.customerApprovalStatus === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {cust.customerApprovalStatus || 'pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Owners */}
                {matchedOwners.length > 0 && (
                  <div className="p-3">
                    <p className="px-3 py-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FiUser className="text-accent-600" /> Owners ({matchedOwners.length})
                    </p>
                    <div className="mt-1 space-y-1">
                      {matchedOwners.map((owner) => (
                        <div
                          key={owner._id}
                          onClick={() => {
                            setShowSearchResults(false);
                            if (onSelectEntity) onSelectEntity('owner', owner);
                            else setActiveTab('owners');
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">{owner.name}</p>
                            <p className="text-xs text-neutral-500">
                              {owner.phone} • {owner.email}
                            </p>
                          </div>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              owner.ownerApprovalStatus === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : owner.ownerApprovalStatus === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {owner.ownerApprovalStatus || 'pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bookings */}
                {matchedBookings.length > 0 && (
                  <div className="p-3">
                    <p className="px-3 py-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FiCalendar className="text-purple-600" /> Bookings ({matchedBookings.length})
                    </p>
                    <div className="mt-1 space-y-1">
                      {matchedBookings.map((bk) => (
                        <div
                          key={bk._id}
                          onClick={() => {
                            setShowSearchResults(false);
                            setActiveTab('bookings');
                          }}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">
                              {bk.bike?.brand} {bk.bike?.model} ({bk.bike?.bikeNumber})
                            </p>
                            <p className="text-xs text-neutral-500">
                              Customer: {bk.customer?.name} • ₹{bk.totalAmount}
                            </p>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-800 uppercase">
                            {bk.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right side: Notifications & Admin Profile */}
      <div className="flex items-center space-x-5 ml-6">
        {/* Notification Bell */}
        <div className="relative" ref={notifContainerRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl text-neutral-600 hover:text-primary-800 hover:bg-neutral-100 transition-colors focus:outline-none"
            aria-label="Notifications"
          >
            <FiBell className="text-xl" />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-primary-600 text-[9px] font-bold text-white">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              </span>
            )}
          </button>

          {/* Notification Menu */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-neutral-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h4 className="font-bold text-sm text-neutral-900">Notifications</h4>
                <span className="text-xs bg-primary-50 text-primary-700 font-semibold px-2 py-0.5 rounded-full">
                  {pendingCount} Pending
                </span>
              </div>

              <div className="py-3 space-y-2 text-sm">
                {pendingCount > 0 ? (
                  <div
                    onClick={() => {
                      setShowNotifications(false);
                      setActiveTab('approvals');
                    }}
                    className="p-3 rounded-xl bg-primary-50/70 border border-primary-100 hover:bg-primary-100/60 cursor-pointer transition-colors"
                  >
                    <p className="font-semibold text-primary-900 text-xs flex items-center justify-between">
                      <span>Pending Approvals Queue</span>
                      <FiArrowRight />
                    </p>
                    <p className="text-xs text-primary-700 mt-1">
                      You have {pendingCount} item{pendingCount > 1 ? 's' : ''} awaiting verification and approval.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-neutral-400 text-xs">
                    <FiCheckCircle className="mx-auto text-2xl text-emerald-500 mb-1" />
                    All approvals are up to date!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Details */}
        <div className="flex items-center space-x-3 pl-3 border-l border-neutral-200">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0b1f14] to-primary-700 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-primary-500/20">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              getInitials(user?.name)
            )}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-bold text-neutral-900 leading-tight">
              {user?.name || 'Administrator'}
            </p>
            <div className="flex items-center space-x-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                {user?.role || 'Admin'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
