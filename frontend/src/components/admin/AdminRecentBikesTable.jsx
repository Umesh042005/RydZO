import React, { useState, useRef, useEffect } from 'react';
import {
  FiMoreVertical,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiTruck,
  FiMapPin,
  FiUser
} from 'react-icons/fi';

const AdminRecentBikesTable = ({
  bikes = [],
  onOpenDetail,
  onApproveBike,
  onRejectBike
}) => {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(val);
    }
  };

  const getStatusBadge = (bike) => {
    const approval = bike.approvalStatus || 'pending';
    const rentalStatus = bike.rentalStatus;

    // Active live ride state
    if (rentalStatus === 'Ongoing') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-1.5 animate-ping"></span>
          Ongoing
        </span>
      );
    }

    // Reserved / confirmed booking
    if (rentalStatus === 'Confirmed') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
          Confirmed
        </span>
      );
    }

    if (approval === 'approved') {
      if (bike.isAvailable !== false) {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Available
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mr-1.5"></span>
          Completed / Idle
        </span>
      );
    }

    if (approval === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
          Pending
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5"></span>
        Rejected
      </span>
    );
  };

  const recentBikes = bikes.slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-bold text-neutral-900">Recent Bikes</h3>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Overview of recently registered motorbikes and approval states
          </p>
        </div>
        <div className="text-xs font-semibold text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200/70">
          Showing {recentBikes.length} of {bikes.length} bikes
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50/75 border-b border-neutral-200/70 text-[11px] uppercase tracking-wider text-neutral-500 font-bold">
              <th className="py-3.5 px-4 w-12 text-center">#</th>
              <th className="py-3.5 px-4 min-w-[200px]">Bike</th>
              <th className="py-3.5 px-4 min-w-[150px]">Owner</th>
              <th className="py-3.5 px-4 min-w-[170px]">Location</th>
              <th className="py-3.5 px-4 min-w-[120px]">Rent/Day</th>
              <th className="py-3.5 px-4 min-w-[120px]">Status</th>
              <th className="py-3.5 px-4 min-w-[130px]">Listed On</th>
              <th className="py-3.5 px-4 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-sm">
            {recentBikes.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-neutral-400">
                  No bikes available.
                </td>
              </tr>
            ) : (
              recentBikes.map((bike, idx) => {
                const isPending = bike.approvalStatus === 'pending';
                const thumb =
                  bike.images?.frontView ||
                  bike.images?.sideView ||
                  bike.images?.backView;

                return (
                  <tr
                    key={bike._id}
                    onClick={(e) => {
                      // Avoid click if user clicked action buttons
                      if (e.target.closest('.no-row-click')) return;
                      onOpenDetail && onOpenDetail('bike', bike);
                    }}
                    className={`transition-colors cursor-pointer group ${
                      isPending ? 'hover:bg-amber-50/30' : 'hover:bg-neutral-50/70'
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 text-center font-semibold text-neutral-400 text-xs">
                      {idx + 1}
                    </td>

                    {/* Bike Name + Thumbnail */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={bike.model}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <FiTruck className="text-neutral-400 text-xl" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 group-hover:text-primary-700 transition-colors">
                            {bike.brand} {bike.model}
                          </p>
                          <p className="text-xs text-neutral-400 font-mono font-medium mt-0.5">
                            {bike.bikeNumber}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 text-xs shrink-0">
                          <FiUser />
                        </div>
                        <div className="truncate max-w-[140px]">
                          <p className="font-medium text-neutral-800 truncate">
                            {bike.owner?.name || 'Owner'}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
                            {bike.owner?.phone || '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start space-x-1.5 text-neutral-600 max-w-[180px]">
                        <FiMapPin className="text-xs text-neutral-400 mt-1 shrink-0" />
                        <span className="text-xs truncate font-medium">
                          {bike.handoverLocation?.address || 'Standard Hub'}
                        </span>
                      </div>
                    </td>

                    {/* Rent / Day */}
                    <td className="py-3.5 px-4">
                      <span className="font-black text-neutral-900">
                        ₹{bike.pricing?.daily || 0}
                      </span>
                      <span className="text-xs text-neutral-400 font-medium"> / day</span>
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4">{getStatusBadge(bike)}</td>

                    {/* Listed On */}
                    <td className="py-3.5 px-4 text-xs font-medium text-neutral-500">
                      {formatDate(bike.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right no-row-click relative">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onOpenDetail && onOpenDetail('bike', bike)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-primary-50 text-neutral-700 hover:text-primary-700 border border-neutral-200 transition-colors flex items-center space-x-1"
                        >
                          <FiEye className="text-xs" />
                          <span>View</span>
                        </button>

                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMenuId(activeMenuId === bike._id ? null : bike._id)
                            }
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                          >
                            <FiMoreVertical className="text-base" />
                          </button>

                          {activeMenuId === bike._id && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-40 text-left divide-y divide-neutral-100 animate-in fade-in slide-in-from-top-1"
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onOpenDetail && onOpenDetail('bike', bike);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 flex items-center space-x-2"
                                >
                                  <FiEye className="text-sm text-neutral-400" />
                                  <span>View Details</span>
                                </button>
                              </div>

                              {isPending && (
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onApproveBike && onApproveBike(bike._id);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center space-x-2"
                                  >
                                    <FiCheckCircle className="text-sm text-emerald-600" />
                                    <span>Approve Bike</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onRejectBike && onRejectBike(bike._id);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center space-x-2"
                                  >
                                    <FiXCircle className="text-sm text-rose-600" />
                                    <span>Reject Bike</span>
                                  </button>
                                </div>
                              )}

                              {bike.approvalStatus === 'approved' && (
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onOpenDetail && onOpenDetail('bike', bike);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 flex items-center space-x-2"
                                  >
                                    <FiXCircle className="text-sm text-rose-600" />
                                    <span>Revoke Approval</span>
                                  </button>
                                </div>
                              )}

                              {bike.approvalStatus === 'rejected' && (
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onApproveBike && onApproveBike(bike._id);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center space-x-2"
                                  >
                                    <FiCheckCircle className="text-sm text-emerald-600" />
                                    <span>Reconsider & Approve</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminRecentBikesTable;
