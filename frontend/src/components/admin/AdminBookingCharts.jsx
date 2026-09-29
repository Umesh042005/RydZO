import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const STAGE_COLORS = {
  Draft: '#94a3b8',      // Slate-400
  Pending: '#f59e0b',    // Amber-500
  Confirmed: '#10b981',  // Emerald-500
  Live: '#06b6d4',       // Cyan-500
  Completed: '#6366f1',  // Indigo-500
  Cancelled: '#f43f5e'   // Rose-500
};

const CustomDonutTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-neutral-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.color }}></span>
          <span className="font-bold text-neutral-900">{data.name}</span>
        </div>
        <p className="text-neutral-600 mt-1 font-semibold">
          Count: <span className="font-bold text-neutral-900">{data.value}</span> ({data.payload.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

const AdminBookingCharts = ({ stats = {}, bookings = [] }) => {
  // Extract counts prioritizing stats from backend endpoint /api/admin/dashboard
  const draftCount =
    stats.pendingBookingDrafts ??
    bookings.filter((b) => b.status === 'pending' && !b.isSentToOwner).length;

  const pendingCount =
    stats.pendingOwnerRequests ??
    bookings.filter((b) => b.status === 'pending' && b.isSentToOwner).length;

  const confirmedCount =
    stats.confirmedBookings ?? bookings.filter((b) => b.status === 'confirmed').length;

  const liveCount =
    stats.liveRentals ?? bookings.filter((b) => b.status === 'ongoing').length;

  const completedCount =
    stats.completedBookings ?? bookings.filter((b) => b.status === 'completed').length;

  const cancelledCount =
    stats.cancelledBookings ?? bookings.filter((b) => b.status === 'cancelled').length;

  const stagesData = [
    { name: 'Draft', count: draftCount, color: STAGE_COLORS.Draft },
    { name: 'Pending', count: pendingCount, color: STAGE_COLORS.Pending },
    { name: 'Confirmed', count: confirmedCount, color: STAGE_COLORS.Confirmed },
    { name: 'Live', count: liveCount, color: STAGE_COLORS.Live },
    { name: 'Completed', count: completedCount, color: STAGE_COLORS.Completed },
    { name: 'Cancelled', count: cancelledCount, color: STAGE_COLORS.Cancelled }
  ];

  const totalCalculated = stagesData.reduce((acc, curr) => acc + curr.count, 0);
  const grandTotal = totalCalculated > 0 ? totalCalculated : (stats.totalBookings || 0);

  // Formatted data for the horizontal stacked bar
  const stackedBarData = [
    {
      category: 'All Bookings',
      Draft: draftCount,
      Pending: pendingCount,
      Confirmed: confirmedCount,
      Live: liveCount,
      Completed: completedCount,
      Cancelled: cancelledCount
    }
  ];

  // Donut chart data with percentages
  const donutData = stagesData.map((item) => {
    const pct = grandTotal > 0 ? ((item.count / grandTotal) * 100).toFixed(1) : '0.0';
    return {
      name: item.name,
      value: item.count,
      percentage: pct,
      color: item.color
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 4. Booking Status Overview - Horizontal Segmented / Stacked Bar Chart */}
      <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Booking Status Overview</h3>
              <p className="text-xs text-neutral-400 font-medium">
                Stage progression of active and historical bookings
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full border border-neutral-200">
              Total: {grandTotal} Bookings
            </span>
          </div>

          {/* Visual horizontal segmented progress bar */}
          <div className="mt-5 mb-3">
            <div className="h-6 w-full rounded-xl overflow-hidden flex bg-neutral-100 border border-neutral-200 shadow-inner">
              {grandTotal === 0 ? (
                <div className="w-full h-full bg-neutral-200 flex items-center justify-center text-[10px] text-neutral-500 font-semibold">
                  No bookings recorded yet
                </div>
              ) : (
                stagesData.map((stage) => {
                  if (stage.count <= 0) return null;
                  const widthPct = (stage.count / grandTotal) * 100;
                  return (
                    <div
                      key={stage.name}
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: stage.color
                      }}
                      className="h-full transition-all duration-500 relative"
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Recharts Stacked Horizontal Bar Container */}
          <div className="h-28 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stackedBarData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="category" hide />
                <Bar dataKey="Draft" stackId="status" fill={STAGE_COLORS.Draft} radius={[4, 0, 0, 4]} />
                <Bar dataKey="Pending" stackId="status" fill={STAGE_COLORS.Pending} />
                <Bar dataKey="Confirmed" stackId="status" fill={STAGE_COLORS.Confirmed} />
                <Bar dataKey="Live" stackId="status" fill={STAGE_COLORS.Live} />
                <Bar dataKey="Completed" stackId="status" fill={STAGE_COLORS.Completed} />
                <Bar dataKey="Cancelled" stackId="status" fill={STAGE_COLORS.Cancelled} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend Below with stage, color, and counts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-neutral-100 mt-3">
          {stagesData.map((stage) => (
            <div
              key={stage.name}
              className="flex items-center justify-between p-2 rounded-xl bg-neutral-50/70 border border-neutral-100"
            >
              <div className="flex items-center space-x-2">
                <span
                  className="w-3 h-3 rounded-md shrink-0 shadow-sm"
                  style={{ backgroundColor: stage.color }}
                ></span>
                <span className="text-xs font-semibold text-neutral-700">{stage.name}</span>
              </div>
              <span className="text-xs font-bold text-neutral-900 bg-white px-2 py-0.5 rounded-md border border-neutral-200">
                {stage.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Total Bookings - Donut / Pie Chart with Percentages */}
      <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Total Bookings</h3>
              <p className="text-xs text-neutral-400 font-medium">
                Stage percentage distribution
              </p>
            </div>
            <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100">
              100% Total
            </span>
          </div>

          {/* Donut Chart Area */}
          <div className="relative h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomDonutTooltip />} />
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={800}
                >
                  {donutData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Inner Center Statistics */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-neutral-900 leading-tight">
                {grandTotal}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                Bookings
              </span>
            </div>
          </div>
        </div>

        {/* Donut Legend Listing Color, Stage Name, and Percentage */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-100 mt-2">
          {donutData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center space-x-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="text-xs text-neutral-600 font-medium truncate">{item.name}</span>
              </div>
              <span className="text-xs font-bold text-neutral-800 ml-1">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminBookingCharts;
