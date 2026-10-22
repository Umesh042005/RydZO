import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { FiSearch, FiPackage, FiMapPin, FiSliders, FiCalendar, FiActivity } from 'react-icons/fi';

// "Royal enfield" + "Royal Enfield Meteor" -> "Royal Enfield Meteor"
const displayName = (bike) => {
  const brand = (bike.brand || '').trim();
  const model = (bike.model || '').trim();
  return model.toLowerCase().startsWith(brand.toLowerCase()) ? model : `${brand} ${model}`.trim();
};

const getMainImage = (bike) => {
  const images = bike?.images || {};
  return images.frontView || images.sideView || images.backView || images.meterPhoto || images.scratches;
};

const BikeList = () => {
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    condition: '',
    brand: ''
  });

  const fetchBikes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.condition) params.append('condition', filters.condition);
      if (filters.brand) params.append('brand', filters.brand);

      const response = await api.get(`/api/bikes?${params.toString()}`);
      setBikes(response.data);
    } catch (error) {
      console.error('Error fetching bikes:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters]);

  useEffect(() => {
    fetchBikes();
  }, [fetchBikes]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBikes();
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        <div className="mb-8">
          <p className="text-primary-400 font-semibold text-sm uppercase tracking-widest">Rent a ride</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl font-bold text-neutral-900">Browse Bikes</h1>
          {!loading && (
            <p className="mt-2 text-neutral-500">
              {bikes.length} {bikes.length === 1 ? 'bike' : 'bikes'} available right now
            </p>
          )}
        </div>

        {/* Search and Filters */}
        <div className="card !p-4 md:!p-5 mb-10">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-11"
                  placeholder="Search brand or model..."
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="md:hidden btn-secondary !px-4"
                aria-label="Toggle filters"
              >
                <FiSliders />
                {activeFilterCount > 0 && <span className="text-xs">{activeFilterCount}</span>}
              </button>
              <button type="submit" className="btn-primary !px-5 md:!px-8" aria-label="Search">
                <span className="hidden sm:inline">Search</span>
                <FiSearch className="sm:hidden" />
              </button>
            </div>

            <div className={`${showFilters ? 'grid' : 'hidden'} md:grid grid-cols-2 md:grid-cols-4 gap-3`}>
              <input
                type="number"
                placeholder="Min ₹/hour"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                className="input-field"
              />
              <input
                type="number"
                placeholder="Max ₹/hour"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                className="input-field"
              />
              <select
                value={filters.condition}
                onChange={(e) => setFilters({ ...filters, condition: e.target.value })}
                className="input-field"
              >
                <option value="">All Conditions</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
              <input
                type="text"
                placeholder="Brand"
                value={filters.brand}
                onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                className="input-field"
              />
            </div>
          </form>
        </div>

        {/* Bike Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card !p-0 overflow-hidden animate-pulse">
                <div className="h-52 bg-neutral-100" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-2/3 bg-neutral-100 rounded" />
                  <div className="h-4 w-1/2 bg-neutral-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : bikes.length === 0 ? (
          <div className="card text-center py-16">
            <FiPackage className="text-5xl text-neutral-400 mx-auto mb-4" />
            <p className="font-display text-xl text-neutral-800">No bikes found</p>
            <p className="text-neutral-500 mt-1 text-sm">Try a different search or clear the filters.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bikes.map((bike) => {
              const mainImage = getMainImage(bike);
              return (
                <Link
                  key={bike._id}
                  to={`/bikes/${bike._id}`}
                  className="group card !p-0 overflow-hidden hover:-translate-y-1 hover:border-primary-500/40 hover:shadow-glow"
                >
                  <div className="relative h-52 bg-neutral-100 overflow-hidden">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={displayName(bike)}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">No image</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {bike.condition && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-black/60 backdrop-blur text-primary-300 border border-primary-500/30">
                        {bike.condition}
                      </span>
                    )}
                    <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur border border-neutral-200/60">
                      <span className="font-display text-lg font-bold text-primary-300">₹{bike.pricing?.hourly}</span>
                      <span className="text-xs text-neutral-600">/hr</span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-display text-lg font-semibold text-neutral-900 truncate">
                      {displayName(bike)}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500 flex items-center gap-1.5">
                      <FiMapPin className="shrink-0 text-primary-400" />
                      <span className="truncate">{bike.handoverLocation?.address || 'Pickup location on request'}</span>
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1"><FiCalendar /> {bike.manufacturingYear}</span>
                        <span className="flex items-center gap-1"><FiActivity /> {bike.mileage} km</span>
                      </div>
                      <span className="text-neutral-700 font-semibold">₹{bike.pricing?.daily}/day</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BikeList;
