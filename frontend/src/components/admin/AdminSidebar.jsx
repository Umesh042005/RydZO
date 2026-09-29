import React from 'react';
import {
  FiGrid,
  FiClock,
  FiCalendar,
  FiActivity,
  FiTruck,
  FiUsers,
  FiBriefcase,
  FiLogOut
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const AdminSidebar = ({ activeTab, setActiveTab, pendingCount = 0 }) => {
  const { logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
    {
      id: 'approvals',
      label: 'Pending Approvals',
      icon: FiClock,
      badge: pendingCount
    },
    { id: 'bookings', label: 'All Bookings', icon: FiCalendar },
    {
      id: 'live',
      label: 'Live Rides',
      icon: FiActivity,
      isLive: true
    },
    { id: 'bikes', label: 'All Bikes', icon: FiTruck },
    { id: 'customers', label: 'All Customers', icon: FiUsers },
    { id: 'owners', label: 'All Owners', icon: FiBriefcase }
  ];

  return (
    <aside className="w-64 bg-[#091811] border-r border-[#153424] flex flex-col justify-between shrink-0 min-h-screen text-neutral-200 select-none">
      {/* Brand & Header */}
      <div>
        <div className="h-20 flex items-center px-6 border-b border-[#153424]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-emerald-400 flex items-center justify-center font-extrabold text-black text-xl shadow-lg shadow-primary-950/60">
              R
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-wider text-white">Ryd<span className="text-primary-400">ZO</span></span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-primary-950 text-primary-400 px-2 py-0.5 rounded-full border border-primary-800/60">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium">Marketplace Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="py-6 px-3 space-y-1.5">
          <p className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Main Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-700 to-primary-800 text-white font-semibold shadow-md shadow-primary-950/40 border border-primary-600/40'
                    : 'text-neutral-300 hover:text-white hover:bg-[#12281d]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`text-lg transition-colors ${
                      isActive ? 'text-primary-300' : 'text-neutral-400 group-hover:text-primary-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold transition-all ${
                      isActive
                        ? 'bg-white text-primary-900 shadow-sm'
                        : 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {item.isLive && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Logout Button */}
      <div className="p-4 border-t border-[#153424]">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2.5 px-4 py-3 rounded-xl text-neutral-300 hover:text-white hover:bg-rose-950/40 hover:border-rose-800/50 border border-transparent transition-all duration-200 font-medium text-sm group"
        >
          <FiLogOut className="text-neutral-400 group-hover:text-rose-400 text-base transition-colors" />
          <span className="group-hover:text-rose-300">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
