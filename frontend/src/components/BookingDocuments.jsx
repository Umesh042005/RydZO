import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiShield, FiPhone, FiCreditCard, FiCamera, FiFileText, FiCheckCircle } from 'react-icons/fi';
import api from '../services/api';

const FileInput = ({ label, hint, accept, capture, file, onChange }) => (
  <label className="block">
    <span className="block text-sm font-medium mb-1.5">{label}</span>
    <input
      type="file"
      accept={accept}
      capture={capture}
      onChange={(e) => onChange(e.target.files?.[0] || null)}
      className="block w-full text-sm text-neutral-600"
    />
    {file ? (
      <span className="mt-1 flex items-center gap-1 text-xs text-primary-400"><FiCheckCircle /> {file.name}</span>
    ) : (
      hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>
    )}
  </label>
);

// Shown in the booking form when the customer hasn't given the documents needed to rent yet
// (typically a new Google sign-up). Calls onReady() once everything required is uploaded.
const BookingDocuments = ({ onReady }) => {
  const [missing, setMissing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: '', licenseNumber: '', aadhaarNumber: '' });
  const [files, setFiles] = useState({ license: null, aadhaar: null, selfie: null });

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users/customer/status');
      const list = data.missingForBooking || [];
      setMissing(list);
      if (list.length === 0) onReady();
      return list;
    } catch {
      setMissing([]);
      onReady();
      return [];
    }
  }, [onReady]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (missing === null) {
    return <p className="text-sm text-neutral-500 py-4 text-center">Checking your documents…</p>;
  }
  if (missing.length === 0) return null;

  const needs = (key) => missing.includes(key);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (needs('phone') && !/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10))) {
      return toast.error('Enter a valid 10-digit mobile number');
    }
    if (needs('drivingLicense') && (!form.licenseNumber.trim() || !files.license)) {
      return toast.error('Add your driving licence number and photo');
    }
    if (needs('aadhaar') && (!/^\d{12}$/.test(form.aadhaarNumber.replace(/\s/g, '')) || !files.aadhaar)) {
      return toast.error('Add your 12-digit Aadhaar number and photo');
    }
    if (needs('selfie') && !files.selfie) {
      return toast.error('Add a selfie');
    }

    setSaving(true);
    try {
      if (needs('phone')) {
        await api.put('/api/users/profile', { phone: form.phone });
      }
      if (needs('drivingLicense')) {
        const fd = new FormData();
        fd.append('document', files.license);
        fd.append('licenseNumber', form.licenseNumber.trim());
        await api.post('/api/users/customer/driving-license', fd);
      }
      if (needs('aadhaar')) {
        const fd = new FormData();
        fd.append('document', files.aadhaar);
        fd.append('type', 'aadhaar');
        fd.append('number', form.aadhaarNumber.replace(/\s/g, ''));
        await api.post('/api/users/customer/identity', fd);
      }
      if (needs('selfie')) {
        const fd = new FormData();
        fd.append('selfie', files.selfie);
        await api.post('/api/users/customer/selfie', fd);
      }
      const stillMissing = await loadStatus();
      if (stillMissing.length === 0) {
        toast.success('Documents submitted. Now choose your dates.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed. Please try again.');
      loadStatus();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
        <FiShield className="text-primary-400 text-xl shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-neutral-900">Quick verification before your first ride</p>
          <p className="text-neutral-600 mt-1">
            Owners hand over their bikes only to verified riders. Upload these once; you can book right after,
            and the owner confirms once RydZo approves them (usually quick).
          </p>
        </div>
      </div>

      {needs('phone') && (
        <label className="block">
          <span className="flex items-center gap-1.5 text-sm font-medium mb-1.5"><FiPhone /> Mobile number</span>
          <input
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input-field"
            placeholder="10-digit mobile number"
          />
        </label>
      )}

      {needs('drivingLicense') && (
        <div className="space-y-3">
          <label className="block">
            <span className="flex items-center gap-1.5 text-sm font-medium mb-1.5"><FiCreditCard /> Driving licence number</span>
            <input
              type="text"
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value.toUpperCase() })}
              className="input-field"
              placeholder="e.g. MH12 20190012345"
            />
          </label>
          <FileInput
            label="Driving licence photo"
            hint="Front side, all text readable (JPG, PNG or PDF)"
            accept="image/*,.pdf"
            file={files.license}
            onChange={(f) => setFiles({ ...files, license: f })}
          />
        </div>
      )}

      {needs('aadhaar') && (
        <div className="space-y-3">
          <label className="block">
            <span className="flex items-center gap-1.5 text-sm font-medium mb-1.5"><FiFileText /> Aadhaar number</span>
            <input
              type="text"
              inputMode="numeric"
              value={form.aadhaarNumber}
              onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })}
              className="input-field"
              placeholder="12-digit Aadhaar number"
            />
          </label>
          <FileInput
            label="Aadhaar card photo"
            hint="JPG, PNG or PDF"
            accept="image/*,.pdf"
            file={files.aadhaar}
            onChange={(f) => setFiles({ ...files, aadhaar: f })}
          />
        </div>
      )}

      {needs('selfie') && (
        <FileInput
          label={<span className="flex items-center gap-1.5"><FiCamera /> Selfie</span>}
          hint="A clear photo of your face (opens the front camera on phones)"
          accept="image/*"
          capture="user"
          file={files.selfie}
          onChange={(f) => setFiles({ ...files, selfie: f })}
        />
      )}

      <button type="submit" disabled={saving} className="w-full btn-primary disabled:opacity-50">
        {saving ? 'Uploading…' : 'Submit & continue to booking'}
      </button>
    </form>
  );
};

export default BookingDocuments;
