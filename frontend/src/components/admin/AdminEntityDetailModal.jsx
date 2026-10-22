import React, { useState, useEffect } from 'react';
import {
  FiX,
  FiCheck,
  FiXCircle,
  FiExternalLink,
  FiUser,
  FiTruck,
  FiFileText,
  FiShield,
  FiAlertTriangle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import AIDocumentCheck from '../ai/AIDocumentCheck';
import { useAIEnabled } from '../../services/ai';

const isLikelyPdf = (url) =>
  typeof url === 'string' && url.toLowerCase().includes('.pdf');

const DocPreview = ({ label, url }) => {
  if (!url) {
    return (
      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs text-neutral-400">
        <span className="font-semibold text-neutral-600 block mb-1">{label}</span>
        Not uploaded
      </div>
    );
  }

  const isPdf = isLikelyPdf(url);

  return (
    <div className="p-3 bg-white rounded-xl border border-neutral-200/80 shadow-xs space-y-2 group hover:border-primary-300 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-neutral-800">{label}</span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary-700 hover:text-primary-900 font-semibold inline-flex items-center gap-1 hover:underline"
        >
          <span>Open</span>
          <FiExternalLink className="text-[10px]" />
        </a>
      </div>

      {!isPdf ? (
        <div className="w-full h-36 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-150">
          <img
            src={url}
            alt={label}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>
      ) : (
        <div className="w-full h-24 rounded-lg bg-neutral-50 border border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-500 text-xs">
          <FiFileText className="text-2xl text-neutral-400 mb-1" />
          <span>PDF Document</span>
        </div>
      )}
    </div>
  );
};

const AdminEntityDetailModal = ({
  isOpen,
  onClose,
  type, // 'customer' | 'owner' | 'bike'
  data,
  onApprove,
  onReject
}) => {
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const aiEnabled = useAIEnabled();

  // Reset reject form state whenever modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      setRejectNote('');
      setShowRejectForm(false);
      setSubmitting(false);
    }
  }, [isOpen, data?._id]);

  if (!isOpen || !data) return null;

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(val);
    }
  };

  // Determine current status across entity types
  const getEntityStatus = () => {
    if (type === 'customer') {
      return (data.customerApprovalStatus || (data.isVerified ? 'approved' : 'pending')).toLowerCase();
    }
    if (type === 'owner') {
      return (data.ownerApprovalStatus || (data.isVerified ? 'approved' : 'pending')).toLowerCase();
    }
    if (type === 'bike') {
      return (data.approvalStatus || 'pending').toLowerCase();
    }
    return 'pending';
  };

  const currentStatus = getEntityStatus();
  const isPending = currentStatus === 'pending';
  const isApproved = currentStatus === 'approved' || currentStatus === 'verified';
  const isRejected = currentStatus === 'rejected';

  const rejectionReasonText =
    data.customerApprovalNote ||
    data.ownerApprovalNote ||
    data.approvalNote;

  const handleApproveClick = async () => {
    try {
      setSubmitting(true);
      await onApprove(type, data._id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectClick = async () => {
    if (!rejectNote.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      setSubmitting(true);
      await onReject(type, data._id, rejectNote.trim());
      setRejectNote('');
      setShowRejectForm(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100/80 text-primary-800 flex items-center justify-center text-lg shadow-xs">
              {type === 'bike' ? <FiTruck /> : <FiUser />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                {type === 'customer' && 'Customer Details & Verification'}
                {type === 'owner' && 'Owner Details & Verification'}
                {type === 'bike' && 'Bike Details & Verification'}
              </h2>
              <p className="text-xs text-neutral-500 font-medium">
                ID: <span className="font-mono text-neutral-700">{data._id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Conditional Status Badge */}
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                isPending
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : isApproved
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              {isPending && 'Pending Review'}
              {isApproved && 'Approved'}
              {isRejected && 'Rejected'}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors"
            >
              <FiX className="text-lg" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Note if previously rejected */}
          {isRejected && rejectionReasonText && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2">
              <FiAlertTriangle className="text-rose-500 text-base mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-rose-900">Previous Rejection Reason:</p>
                <p className="mt-0.5 text-rose-700">{rejectionReasonText}</p>
              </div>
            </div>
          )}

          {/* Customer Details */}
          {type === 'customer' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Full Name</span>
                  <p className="font-bold text-neutral-900 text-base">{data.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Contact</span>
                  <p className="font-medium text-neutral-800">{data.phone}</p>
                  <p className="text-xs text-neutral-500">{data.email}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Aadhaar / PAN</span>
                  <p className="font-mono text-xs text-neutral-700">Aadhaar: {data.aadhaarNumber || '—'}</p>
                  <p className="font-mono text-xs text-neutral-700">PAN: {data.panNumber || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Driving License No.</span>
                  <p className="font-mono text-xs text-neutral-700 font-bold">
                    {data.drivingLicense?.number || '—'}
                  </p>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Address</span>
                  <p className="text-neutral-700 text-xs">
                    {[
                      data.address?.street,
                      data.address?.city,
                      data.address?.state,
                      data.address?.pincode
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
                  <FiShield className="text-primary-700" /> Uploaded Customer Verification Documents
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DocPreview label="Driving License" url={data.drivingLicense?.documentUrl} />
                  <DocPreview label="Customer Selfie" url={data.selfieUrl} />
                  <DocPreview label="Aadhaar Card" url={data.aadhaarDocumentUrl} />
                  <DocPreview label="PAN Card" url={data.panDocumentUrl} />
                </div>
              </div>

              {aiEnabled && data.drivingLicense?.documentUrl && (
                <AIDocumentCheck key={data._id} type="customer" id={data._id} />
              )}
            </>
          )}

          {/* Owner Details */}
          {type === 'owner' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Owner Name</span>
                  <p className="font-bold text-neutral-900 text-base">{data.name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Contact Information</span>
                  <p className="font-medium text-neutral-800">{data.phone}</p>
                  <p className="text-xs text-neutral-500">{data.email}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Govt ID Numbers</span>
                  <p className="font-mono text-xs text-neutral-700">Aadhaar: {data.aadhaarNumber || '—'}</p>
                  <p className="font-mono text-xs text-neutral-700">PAN: {data.panNumber || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Joined On</span>
                  <p className="text-xs text-neutral-700">{formatDate(data.createdAt)}</p>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Address</span>
                  <p className="text-neutral-700 text-xs">
                    {[
                      data.address?.street,
                      data.address?.city,
                      data.address?.state,
                      data.address?.pincode
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
                  <FiShield className="text-primary-700" /> Uploaded Owner Verification Documents
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DocPreview label="Aadhaar Card" url={data.aadhaarDocumentUrl} />
                  <DocPreview label="PAN Card" url={data.panDocumentUrl} />
                </div>
              </div>
            </>
          )}

          {/* Bike Details */}
          {type === 'bike' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Bike Details</span>
                  <p className="font-bold text-neutral-900 text-base">
                    {data.brand} {data.model}
                  </p>
                  <p className="font-mono text-xs font-semibold text-primary-800">
                    {data.bikeNumber}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Owner</span>
                  <p className="font-semibold text-neutral-800">{data.owner?.name || 'Owner'}</p>
                  <p className="text-xs text-neutral-500">{data.owner?.phone}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Pricing</span>
                  <p className="font-bold text-neutral-900">₹{data.pricing?.daily || 0}/day</p>
                  <p className="text-xs text-neutral-500">₹{data.pricing?.hourly || 0}/hour</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Condition & Year</span>
                  <p className="text-xs text-neutral-700 font-medium">
                    {data.manufacturingYear} • {data.condition || 'good'} • {data.mileage} km
                  </p>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <span className="text-xs font-semibold text-neutral-400">Handover Location</span>
                  <p className="text-xs text-neutral-700">
                    {data.handoverLocation?.address || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Photos Gallery */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
                  <FiTruck className="text-primary-700" /> Bike Photos
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <DocPreview label="Front View" url={data.images?.frontView} />
                  <DocPreview label="Side View" url={data.images?.sideView} />
                  <DocPreview label="Back View" url={data.images?.backView} />
                  <DocPreview label="Meter Photo" url={data.images?.meterPhoto} />
                  <DocPreview label="Scratches / Marks" url={data.images?.scratches} />
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
                  <FiFileText className="text-primary-700" /> Bike Registration Documents
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DocPreview label="RC Document" url={data.documents?.rc?.documentUrl} />
                  <DocPreview label="PUC Document" url={data.documents?.puc?.documentUrl} />
                  <DocPreview label="Insurance Document" url={data.documents?.insurance?.documentUrl} />
                </div>
              </div>

              {aiEnabled && <AIDocumentCheck key={data._id} type="bike" id={data._id} />}
            </>
          )}

          {/* Mandatory Rejection / Revocation Reason Form */}
          {showRejectForm && (
            <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 animate-in fade-in duration-150 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-rose-900">
                  {isApproved
                    ? 'Reason for Revoking Approval (Required)'
                    : 'Reason for Rejection (Required)'}
                </label>
                <span className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider">
                  Mandatory
                </span>
              </div>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={
                  isApproved
                    ? 'Explain why this approval is being revoked (e.g. invalid document found, policy breach)...'
                    : 'Specify what document is invalid, missing, or why this request is rejected...'
                }
                rows={3}
                className="w-full p-3 text-xs bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-neutral-800 placeholder-neutral-400 shadow-xs"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectNote('');
                  }}
                  className="px-3.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectClick}
                  disabled={submitting || !rejectNote.trim()}
                  className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl disabled:opacity-50 transition-colors shadow-xs"
                >
                  {submitting
                    ? isApproved
                      ? 'Revoking...'
                      : 'Rejecting...'
                    : isApproved
                    ? 'Confirm Revocation'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions - Strictly Conditional */}
        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-semibold text-xs hover:bg-neutral-100 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center space-x-3">
            {/* CONDITION 1: Status is 'pending' */}
            {isPending && (
              <>
                {!showRejectForm && (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition-colors flex items-center space-x-1.5"
                  >
                    <FiXCircle className="text-sm" />
                    <span>Reject</span>
                  </button>
                )}

                <button
                  onClick={handleApproveClick}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700 text-white font-bold text-xs shadow-md shadow-primary-900/20 transition-all flex items-center space-x-1.5"
                >
                  <FiCheck className="text-base" />
                  <span>{submitting ? 'Approving...' : 'Accept & Approve'}</span>
                </button>
              </>
            )}

            {/* CONDITION 2: Status is 'approved' or 'verified' */}
            {isApproved && (
              <>
                {!showRejectForm && (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-xs"
                  >
                    <FiXCircle className="text-sm" />
                    <span>Reject / Revoke Approval</span>
                  </button>
                )}
              </>
            )}

            {/* CONDITION 3: Status is 'rejected' */}
            {isRejected && (
              <button
                onClick={handleApproveClick}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700 text-white font-bold text-xs shadow-md shadow-primary-900/20 transition-all flex items-center space-x-1.5"
              >
                <FiCheck className="text-base" />
                <span>{submitting ? 'Approving...' : 'Reconsider & Approve'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEntityDetailModal;
