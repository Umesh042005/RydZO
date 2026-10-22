import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiNavigation, FiClock, FiMapPin, FiAlertCircle } from 'react-icons/fi';
import { formatBookingDateTime, formatBookingTimeSlot } from '../utils/dateUtils';
import GoogleMapView from '../components/maps/GoogleMapView';
import OSMMapView from '../components/maps/osm/OSMMapView';
import { calculateRouteFromCurrentLocation as googleRouteCalc } from '../services/routesService';
import { calculateRouteFromCurrentLocation as osmRouteCalc } from '../services/osm/osmRoutesService';
import { isOsmProvider } from '../config/mapProvider';
import DamageCheck from '../components/ai/DamageCheck';
import { useAIEnabled } from '../services/ai';

const ActiveMapView = isOsmProvider() ? OSMMapView : GoogleMapView;
const calculateRouteFromCurrentLocation = isOsmProvider() ? osmRouteCalc : googleRouteCalc;

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const aiEnabled = useAIEnabled();
  const [booking, setBooking] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [consentFlags, setConsentFlags] = useState({
    locationTracking: false,
    geoFencing: false,
    damageResponsibility: false,
    lateReturnPenalty: false,
    theftFIR: false,
    securityDeposit: false,
    ownerHandover: false,
    aggregatorDisclaimer: false
  });
  const [depositConsent, setDepositConsent] = useState({
    terms: false,
    rules: false
  });
  const [showEndRide, setShowEndRide] = useState(false);
  const [manualPayment, setManualPayment] = useState(false);

  const mandatoryConsentOk = useMemo(() => {
    return !!(
      consentFlags.locationTracking &&
      consentFlags.geoFencing &&
      consentFlags.damageResponsibility &&
      consentFlags.theftFIR &&
      consentFlags.securityDeposit &&
      consentFlags.ownerHandover &&
      consentFlags.aggregatorDisclaimer
    );
  }, [consentFlags]);

  const fetchBookingDetails = useCallback(async () => {
    try {
      const [bookingRes, agreementRes] = await Promise.all([
        api.get(`/api/bookings/${id}`),
        api.get(`/api/agreements/booking/${id}`).catch(() => null)
      ]);
      setBooking(bookingRes.data);

      if (agreementRes?.data) {
        setAgreement(agreementRes.data);
      } else {
        // Ensure agreement exists (older bookings might not have one)
        const created = await api.post('/api/agreements', { bookingId: id });
        setAgreement(created.data.agreement);
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  useEffect(() => {
    if (booking?.status !== 'ongoing' || !booking?.actualHandoverTime) {
      setElapsedMs(null);
      return;
    }

    const start = new Date(booking.actualHandoverTime).getTime();
    const tick = () => setElapsedMs(Math.max(0, Date.now() - start));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [booking?.status, booking?.actualHandoverTime]);

  const formatDuration = (ms) => {
    if (ms == null) return '—';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };



  const handleAcceptAgreement = async () => {
    try {
      setActionLoading(true);
      await api.post(`/api/agreements/${agreement._id}/accept`, {
        useOTP: false,
        consentFlags
      });
      toast.success('Agreement accepted successfully!');
      fetchBookingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept agreement');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayAdvance = async () => {
    try {
      setActionLoading(true);
      await api.post(`/api/bookings/${id}/advance-payment`, {
        transactionId: `TEST-${Date.now()}`
      });
      toast.success('Advance payment completed!');
      fetchBookingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete advance payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendRequestToOwner = async () => {
    try {
      setActionLoading(true);
      await api.post(`/api/bookings/${id}/submit-request`);
      toast.success('Request sent to owner!');
      fetchBookingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request to owner');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOwnerRespond = async (decision) => {
    try {
      setActionLoading(true);
      await api.post(`/api/bookings/${id}/owner/respond`, { decision });
      toast.success(`Booking ${decision}ed`);
      fetchBookingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to respond');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCollectDeposit = async () => {
    try {
      setActionLoading(true);
      await api.post(`/api/bookings/${id}/security-deposit/collect`);
      toast.success('Security deposit marked as collected');
      fetchBookingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark security deposit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartRide = async () => {
    try {
      setActionLoading(true);
      await api.post(`/api/bookings/${id}/start`);
      toast.success('Ride started!');
      fetchBookingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start ride');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCalculateRoute = async () => {
    const coords = booking?.bike?.handoverLocation?.coordinates;
    const hasCoords = coords && coords.lat != null && coords.lng != null;
    const address = booking?.bike?.handoverLocation?.address?.trim();
    // Older listings only have an address; the routing service can geocode it
    if (!hasCoords && !address) {
      toast.error('Location not available for route calculation');
      return;
    }

    setCalculatingRoute(true);
    setRouteError(null);
    try {
      const result = await calculateRouteFromCurrentLocation(
        hasCoords ? { lat: Number(coords.lat), lng: Number(coords.lng) } : address
      );
      if (result.available) {
        setRouteInfo(result);
        toast.success(`Distance: ${result.distance.text} • ETA: ${result.duration.text}`);
      } else {
        setRouteError(result.error || 'Could not calculate route');
        toast.error(result.error || 'Could not calculate route');
      }
    } catch (err) {
      setRouteError('Failed to calculate route from your location');
      toast.error('Failed to calculate route from your location');
    } finally {
      setCalculatingRoute(false);
    }
  };

  const handleAuthorizeDeposit = async () => {
    try {
      setActionLoading(true);
      await api.post(`/api/bookings/${id}/security-deposit/authorize`);
      toast.success('Security deposit authorized! waiting for handover.');
      fetchBookingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to authorize deposit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndRide = async () => {
    try {
      setActionLoading(true);
      await api.post(`/api/bookings/${id}/end`, {
        paymentMethod: manualPayment ? 'manual' : 'online'
      });
      toast.success('Ride ended successfully!');
      setShowEndRide(false);
      fetchBookingDetails();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to end ride');
    } finally {
      setActionLoading(false);
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

  if (!booking) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">Booking not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-12">
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="mb-4 inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors shadow-xs"
          >
            ← Back to Admin Panel
          </button>
        )}
        <h1 className="text-4xl font-bold mb-8 text-neutral-900">Booking Details</h1>

        <div className="card mb-6">
          <h2 className="text-2xl font-semibold mb-4">Bike Information</h2>
          <p className="text-lg">{booking.bike?.brand} {booking.bike?.model}</p>
          <p className="text-neutral-600">Number: {booking.bike?.bikeNumber}</p>
          <p className="text-neutral-600">Owner: {booking.owner?.name} ({booking.owner?.phone})</p>
        </div>

        {/* Pickup / Handover Location Card */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FiMapPin className="text-primary-700" />
              Pickup & Handover Location
            </h2>
            {((booking.bike?.handoverLocation?.coordinates?.lat != null &&
              booking.bike?.handoverLocation?.coordinates?.lng != null) ||
              booking.bike?.handoverLocation?.address?.trim()) && (
              <button
                type="button"
                onClick={handleCalculateRoute}
                disabled={calculatingRoute}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors border border-primary-200 self-start sm:self-auto disabled:opacity-60"
              >
                <FiNavigation className="text-xs" />
                {calculatingRoute ? 'Calculating Route...' : 'Get Directions'}
              </button>
            )}
          </div>

          {booking.bike?.handoverLocation?.address ? (
            <p className="text-neutral-700 mb-3">{booking.bike.handoverLocation.address}</p>
          ) : (
            <p className="text-neutral-500 italic mb-3">Handover location will be coordinated directly with the owner.</p>
          )}

          {routeInfo && routeInfo.available && (
            <div className="mb-3 p-3 bg-primary-50 border border-primary-200 rounded-lg flex flex-wrap gap-4 text-sm text-primary-900">
              <div className="flex items-center gap-1.5">
                <FiNavigation className="text-primary-600" />
                <span><strong>Distance:</strong> {routeInfo.distance.text}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FiClock className="text-primary-600" />
                <span><strong>Est. Drive Time:</strong> {routeInfo.duration.text}</span>
              </div>
            </div>
          )}

          {routeError && (
            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <FiAlertCircle className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{routeError}</p>
                <p className="text-amber-700 mt-0.5">
                  You can also use the external map link below to view directions directly.
                </p>
              </div>
            </div>
          )}

          <ActiveMapView
            coordinates={booking.bike?.handoverLocation?.coordinates}
            address={booking.bike?.handoverLocation?.address || ''}
            directionsResult={routeInfo?.directionsResult || null}
            height="260px"
          />
        </div>

        <div className="card mb-6">
          <h2 className="text-2xl font-semibold mb-4">Booking Information</h2>
          <div className="space-y-2">
            <p><span className="font-semibold">Type:</span> <span className="capitalize">{booking.bookingType} Rental</span></p>
            <p><span className="font-semibold">Start:</span> {formatBookingDateTime(booking.startTime, booking.startTimeStr)}</p>
            <p><span className="font-semibold">End:</span> {formatBookingDateTime(booking.endTime, booking.endTimeStr)}</p>
            <p><span className="font-semibold">Time Slot:</span> {formatBookingTimeSlot(booking.startTimeStr, booking.endTimeStr, booking.startTime, booking.endTime)}</p>
            <p><span className="font-semibold">Duration:</span> {booking.duration?.hours} hours</p>
            <p><span className="font-semibold">Total Amount:</span> ₹{booking.totalAmount}</p>
            <p><span className="font-semibold">Security Deposit:</span> ₹{booking.securityDeposit}</p>
            <p><span className="font-semibold">Request Sent to Owner:</span> {booking.isSentToOwner ? 'Yes' : 'No'}</p>
            <p><span className="font-semibold">Owner Decision:</span> {booking.ownerDecision?.status || 'pending'}</p>
            <p><span className="font-semibold">Security Deposit Status:</span> {booking.securityDepositStatus || 'pending'}</p>
            <p><span className="font-semibold">Status:</span> {booking.status}</p>
            {booking.status === 'ongoing' && (
              <p><span className="font-semibold">Ride Time Elapsed:</span> {formatDuration(elapsedMs)}</p>
            )}
          </div>
        </div>

        {agreement && (
          <div className="card mb-6">
            <h2 className="text-2xl font-semibold mb-4">Digital Agreement</h2>
            {agreement.accepted ? (
              <div className="bg-primary-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FiCheckCircle className="text-primary-700" />
                  <span className="font-semibold">Agreement Accepted</span>
                </div>
                <p className="text-sm text-neutral-600">
                  Accepted on {new Date(agreement.acceptedAt).toLocaleString()}
                </p>
              </div>
            ) : user?.role !== 'customer' ? (
              // Only the renter signs the agreement; owners and admins just see where it stands.
              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
                  <FiClock className="shrink-0" />
                  <span className="text-sm font-medium">Waiting for the customer to accept the agreement.</span>
                </div>
                <details className="group">
                  <summary className="cursor-pointer text-sm font-semibold text-primary-700 select-none">
                    View agreement text
                  </summary>
                  <div className="bg-neutral-100 p-4 rounded-lg mt-3 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">{agreement.agreementText}</pre>
                  </div>
                </details>
              </div>
            ) : (
              <div>
                <div className="bg-neutral-100 p-4 rounded-lg mb-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">{agreement.agreementText}</pre>
                </div>
                <div className="space-y-3 mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={consentFlags.locationTracking}
                      onChange={(e) => setConsentFlags({ ...consentFlags, locationTracking: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>I consent to live location tracking via GPS *</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={consentFlags.geoFencing}
                      onChange={(e) => setConsentFlags({ ...consentFlags, geoFencing: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>I agree to geo-fencing rules *</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={consentFlags.damageResponsibility}
                      onChange={(e) => setConsentFlags({ ...consentFlags, damageResponsibility: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>I accept responsibility for damages *</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={consentFlags.lateReturnPenalty}
                      onChange={(e) => setConsentFlags({ ...consentFlags, lateReturnPenalty: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>I accept late return penalty terms</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={consentFlags.theftFIR}
                      onChange={(e) => setConsentFlags({ ...consentFlags, theftFIR: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>I understand FIR is mandatory in case of theft *</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={consentFlags.securityDeposit}
                      onChange={(e) => setConsentFlags({ ...consentFlags, securityDeposit: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>I understand security deposit terms *</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={consentFlags.ownerHandover}
                      onChange={(e) => setConsentFlags({ ...consentFlags, ownerHandover: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>I understand bike handover is done by owner *</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={consentFlags.aggregatorDisclaimer}
                      onChange={(e) => setConsentFlags({ ...consentFlags, aggregatorDisclaimer: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>I understand RYDZO is only an aggregator *</span>
                  </label>
                </div>
                <button
                  onClick={handleAcceptAgreement}
                  disabled={!mandatoryConsentOk || actionLoading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Processing...' : 'Accept Agreement'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Customer workflow */}
        {user?.role === 'customer' && (
          <div className="card mb-6">
            <h2 className="text-2xl font-semibold mb-4">Next Steps</h2>
            {!booking.agreementAccepted ? (
              <p className="text-neutral-700">Step 1: Accept the digital agreement above.</p>
            ) : !booking.isSentToOwner ? (
              <div className="space-y-3">
                <p className="text-neutral-700">Step 2: Send booking request to the owner.</p>
                <button
                  onClick={handleSendRequestToOwner}
                  disabled={actionLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Send Request (No Payment)'}
                </button>
              </div>
            ) : booking.ownerDecision?.status === 'pending' ? (
              <p className="text-neutral-700">Waiting for owner to accept or decline your request.</p>
            ) : booking.status === 'confirmed' && booking.securityDepositStatus === 'pending' ? (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Step 3: Security Deposit</h3>
                <p className="text-neutral-600">
                  Please authorize the security deposit of <strong>₹{booking.securityDeposit}</strong>.
                  <br />
                  <span className="text-sm text-neutral-500">
                    (Note: This is a dummy click-based deposit. No real money is taken now.
                    It is considered paid when owner hands over the bike.)
                  </span>
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={depositConsent.terms}
                      onChange={(e) => setDepositConsent({ ...depositConsent, terms: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>I agree to the terms & conditions</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={depositConsent.rules}
                      onChange={(e) => setDepositConsent({ ...depositConsent, rules: e.target.checked })}
                      className="w-5 h-5"
                    />
                    <span>I understand the deposit and payment rules</span>
                  </label>
                </div>

                <button
                  onClick={handleAuthorizeDeposit}
                  disabled={actionLoading || !depositConsent.terms || !depositConsent.rules}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Processing...' : 'Authorize Security Deposit'}
                </button>
              </div>
            ) : booking.status === 'confirmed' ? (
              <div className="bg-green-50 border border-green-200 p-4 rounded text-green-900 space-y-3">
                <p className="font-semibold text-lg">Booking Confirmed by Owner!</p>
                <p className="text-sm">
                  {booking.securityDepositStatus === 'authorized' || booking.securityDepositStatus === 'collected'
                    ? 'Security deposit is authorized. Please meet the owner for physical bike handover. The owner will start the ride once the bike is handed over.'
                    : 'Owner has accepted your request. Please authorize the security deposit to proceed.'}
                </p>
                <p className="text-xs text-neutral-600 mt-1">
                  The ride will begin only after the owner confirms physical handover and starts the ride.
                </p>
              </div>
            ) : booking.status === 'ongoing' ? (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded text-blue-900 space-y-2">
                <p className="font-semibold text-lg">Ride is Currently Active!</p>
                <p className="text-sm">Time Elapsed: <span className="font-mono font-bold text-primary-700">{formatDuration(elapsedMs)}</span></p>
                <p className="text-xs text-neutral-600">Enjoy your ride! Hand over the bike to the owner at the return location once completed.</p>
              </div>
            ) : booking.status === 'completed' ? (
              <div className="bg-green-50 border border-green-200 p-4 rounded text-green-900 space-y-2">
                <p className="font-semibold text-lg">Ride Completed!</p>
                <p className="text-sm">Total Rent: ₹{booking.finalTotalAmount || booking.totalAmount}</p>
                <p className="text-xs text-neutral-600">Thank you for riding with RydZO.</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Owner actions */}
        {user?.role === 'owner' && (
          <div className="card mb-6">
            <h2 className="text-2xl font-semibold mb-4">Owner Actions</h2>

            {['pending', 'confirmed'].includes(booking.status) && booking.customer?.customerApprovalStatus !== 'approved' && (
              <div className="flex gap-2 items-start mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <FiClock className="shrink-0 mt-0.5" />
                <span>
                  The rider's documents are still being checked by RydZo. You can accept the request and hand over
                  the bike once they are approved.
                </span>
              </div>
            )}

            {booking.status === 'pending' && booking.isSentToOwner && booking.ownerDecision?.status === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleOwnerRespond('accept')}
                  disabled={actionLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  Accept Request
                </button>
                <button
                  onClick={() => handleOwnerRespond('decline')}
                  disabled={actionLoading}
                  className="btn-secondary disabled:opacity-50"
                >
                  Reject Request
                </button>
              </div>
            )}

            {booking.status === 'confirmed' && (
              <div className="space-y-3">
                {booking.securityDepositStatus === 'pending' ? (
                  <div className="bg-yellow-50 p-4 rounded text-yellow-800">
                    <p>Wait for customer to authorize security deposit (Dummy step).</p>
                    <p className="text-sm mt-1">Once authorized, you can proceed to handover.</p>
                  </div>
                ) : booking.securityDepositStatus === 'authorized' ? (
                  <div className="space-y-3">
                    <p className="text-green-700 font-semibold">✅ Customer has authorized the security deposit.</p>
                    <p className="text-sm text-neutral-600">
                      Please verify the deposit amount, physically hand over the bike to the customer, and then start the ride.
                    </p>
                    <button
                      onClick={handleStartRide}
                      disabled={actionLoading}
                      className="btn-primary w-full sm:w-auto"
                    >
                      {actionLoading ? 'Starting...' : 'Start Ride (Handover & Start)'}
                    </button>
                  </div>
                ) : booking.securityDepositStatus === 'collected' ? (
                  <div className="space-y-3">
                    <p className="text-neutral-700">Deposit collected. Ready to start ride.</p>
                    <button
                      onClick={handleStartRide}
                      disabled={actionLoading}
                      className="btn-primary disabled:opacity-50"
                    >
                      Start Ride (Start Timer)
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {booking.status === 'ongoing' && (
              <div className="space-y-4">
                <p className="text-neutral-700 text-lg font-semibold">
                  Ride is Active. <br />
                  <span className="text-primary-600">Timer: {formatDuration(elapsedMs)}</span>
                </p>

                {!showEndRide ? (
                  <button
                    onClick={() => setShowEndRide(true)}
                    className="btn-primary bg-red-600 hover:bg-red-700"
                  >
                    Close Ride / Return Bike
                  </button>
                ) : (
                  <div className="bg-white border rounded p-4 space-y-3 shadow-sm">
                    <h3 className="font-semibold">Close Ride Details</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manualPayment}
                        onChange={(e) => setManualPayment(e.target.checked)}
                        className="w-5 h-5"
                      />
                      <span>Mark payment received manually</span>
                    </label>

                    <p className="text-sm text-neutral-500">
                      App commission will be calculated automatically.
                    </p>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleEndRide}
                        disabled={actionLoading}
                        className="btn-primary bg-red-600 hover:bg-red-700"
                      >
                        {actionLoading ? 'Processing...' : 'Confirm Return & Close'}
                      </button>
                      <button
                        onClick={() => setShowEndRide(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {booking.status === 'completed' && (
              <div className="bg-green-50 p-4 rounded border border-green-200">
                <h3 className="font-semibold text-green-800">Ride Closed</h3>
                <p>Total Rent: ₹{booking.finalTotalAmount}</p>
                <p>Commission: ₹{booking.finalCommission}</p>
                <p className="font-bold">Owner Payout: ₹{booking.finalOwnerPayout}</p>
                <p className="text-sm text-neutral-600 mt-2">
                  Payment Method: {booking.paymentMethod === 'manual' ? 'Manual (Cash/UPI)' : 'Online'}
                </p>
              </div>
            )}
          </div>
        )}

        {aiEnabled && ['ongoing', 'completed', 'disputed'].includes(booking.status) &&
          (user?.role === 'owner' || user?.role === 'admin') && (
          <DamageCheck
            booking={booking}
            canRun={user?.role === 'owner'}
            onUpdated={fetchBookingDetails}
          />
        )}

        {/* Admin Actions */}
        {user?.role === 'admin' && booking.status === 'confirmed' && (
          <div className="card mb-6 border-2 border-primary-200 bg-primary-50/20">
            <h2 className="text-xl font-bold mb-2">Admin Action</h2>
            <p className="text-sm text-neutral-600 mb-4">
              This booking is confirmed. You can start the ride on behalf of the users to immediately activate tracking and push it to Live Rides.
            </p>
            <button
              onClick={handleStartRide}
              disabled={actionLoading}
              className="btn-primary"
            >
              {actionLoading ? 'Starting...' : 'Start Ride (Force Activate Live Ride)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetails;

