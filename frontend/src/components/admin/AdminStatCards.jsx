import React from 'react';
import {
  FiUsers,
  FiBriefcase,
  FiTruck,
  FiCalendar,
  FiTrendingUp,
  FiTrendingDown
} from 'react-icons/fi';

const calculateMonthlyChange = (items = []) => {
  if (!items || items.length === 0) {
    return { percentage: '0.0%', isPositive: true };
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  let currentPeriodCount = 0;
  let previousPeriodCount = 0;

  items.forEach((item) => {
    if (!item.createdAt) return;
    const date = new Date(item.createdAt);
    if (date >= thirtyDaysAgo && date <= now) {
      currentPeriodCount++;
    } else if (date >= sixtyDaysAgo && date < thirtyDaysAgo) {
      previousPeriodCount++;
    }
  });

  if (previousPeriodCount === 0) {
    if (currentPeriodCount > 0) {
      return { percentage: '+100%', isPositive: true };
    }
    return { percentage: '+0.0%', isPositive: true };
  }

  const change = ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100;
  const isPositive = change >= 0;
  const formatted = `${isPositive ? '+' : ''}${change.toFixed(1)}%`;

  return { percentage: formatted, isPositive };
};

const AdminStatCards = ({
  stats = {},
  customers = [],
  owners = [],
  bikes = [],
  bookings = [],
  onCardClick
}) => {
  const customerTrend = calculateMonthlyChange(customers);
  const ownerTrend = calculateMonthlyChange(owners);
  const bikeTrend = calculateMonthlyChange(bikes);
  const bookingTrend = calculateMonthlyChange(bookings);

  const cards = [
    {
      id: 'customers',
      title: 'Customers',
      total: stats.totalCustomers ?? customers.length,
      trend: customerTrend,
      icon: FiUsers,
      bgIcon: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      accentGlow: 'hover:border-emerald-300'
    },
    {
      id: 'owners',
      title: 'Owners',
      total: stats.totalOwners ?? owners.length,
      trend: ownerTrend,
      icon: FiBriefcase,
      bgIcon: 'bg-amber-50 text-amber-600 border-amber-100',
      accentGlow: 'hover:border-amber-300'
    },
    {
      id: 'bikes',
      title: 'Bikes',
      total: stats.totalBikes ?? bikes.length,
      trend: bikeTrend,
      icon: FiTruck,
      bgIcon: 'bg-blue-50 text-blue-600 border-blue-100',
      accentGlow: 'hover:border-blue-300'
    },
    {
      id: 'bookings',
      title: 'Bookings',
      total: stats.totalBookings ?? bookings.length,
      trend: bookingTrend,
      icon: FiCalendar,
      bgIcon: 'bg-purple-50 text-purple-600 border-purple-100',
      accentGlow: 'hover:border-purple-300'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isUp = card.trend.isPositive;

        return (
          <div
            key={card.id}
            onClick={() => onCardClick && onCardClick(card.id)}
            className={`bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between ${card.accentGlow} group`}
          >
            {/* Left colored icon */}
            <div className="flex items-center space-x-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border ${card.bgIcon} transition-transform group-hover:scale-105 duration-200 shadow-sm`}
              >
                <Icon />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  {card.title}
                </p>
                <p className="text-2xl font-black text-neutral-900 mt-0.5">
                  {card.total.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Right trend badge */}
            <div className="text-right">
              <div
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  isUp
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                }`}
              >
                {isUp ? (
                  <FiTrendingUp className="text-xs" />
                ) : (
                  <FiTrendingDown className="text-xs" />
                )}
                <span>{card.trend.percentage}</span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium mt-1">vs last month</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminStatCards;
