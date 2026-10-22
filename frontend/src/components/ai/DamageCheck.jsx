import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { aiErrorMessage, AI_TIMEOUT_MS } from '../../services/ai';

const SEVERITY_STYLES = {
  none: 'bg-green-50 border-green-200 text-green-900',
  minor: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  moderate: 'bg-orange-50 border-orange-200 text-orange-900',
  severe: 'bg-red-50 border-red-200 text-red-900'
};

// Owner uploads photos of the returned bike; AI compares them with the "before" photos.
// Admins see the saved report read-only.
const DamageCheck = ({ booking, canRun, onUpdated }) => {
  const [files, setFiles] = useState([]);
  const [running, setRunning] = useState(false);
  const report = booking.damageProof?.aiReport;
  const hasReport = Boolean(report?.checkedAt);
  const hasReturnPhotos = (booking.damageProof?.endPhotos || []).length > 0;

  if (!canRun && !hasReport) return null;

  const runCheck = async () => {
    if (!files.length && !hasReturnPhotos) {
      toast.error('Add at least one photo of the returned bike');
      return;
    }
    const form = new FormData();
    files.forEach((file) => form.append('photos', file));
    setRunning(true);
    try {
      await api.post(`/api/ai/bookings/${booking._id}/damage-check`, form, { timeout: AI_TIMEOUT_MS });
      toast.success('Damage check complete');
      setFiles([]);
      onUpdated?.();
    } catch (error) {
      toast.error(aiErrorMessage(error, 'Damage check failed'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="card mb-6">
      <h2 className="text-2xl font-semibold mb-1">✨ AI Damage Check</h2>
      <p className="text-sm text-neutral-600 mb-4">
        Compares photos of the returned bike with its listing / handover photos and flags new scratches or dents.
        It is a helper, not a final decision.
      </p>

      {canRun && (
        <div className="space-y-3 mb-4">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 4))}
            className="block w-full text-sm"
          />
          <p className="text-xs text-neutral-500">
            Up to 4 photos: front, both sides and back, similar angles to the listing photos.
          </p>
          <button onClick={runCheck} disabled={running} className="btn-primary disabled:opacity-50">
            {running ? 'Checking photos… (can take a minute)' : hasReport ? 'Run check again' : 'Run AI damage check'}
          </button>
        </div>
      )}

      {hasReport && (
        <div className={`p-4 rounded border space-y-2 ${SEVERITY_STYLES[report.severity] || SEVERITY_STYLES.none}`}>
          <p className="font-semibold">
            {report.newDamageFound ? `New damage found — ${report.severity}` : 'No new damage found'}
            <span className="text-xs font-normal ml-2">(confidence: {report.confidence})</span>
          </p>
          {report.summary && <p className="text-sm">{report.summary}</p>}
          {report.findings?.length > 0 && (
            <ul className="list-disc list-inside text-sm">
              {report.findings.map((f, i) => (
                <li key={i}>
                  <span className="font-medium">{f.area}:</span> {f.description}
                </li>
              ))}
            </ul>
          )}
          {report.newDamageFound && report.estimatedRepairCost > 0 && (
            <p className="text-sm font-semibold">Estimated repair cost: ₹{report.estimatedRepairCost}</p>
          )}
          {report.comparedAfter?.length > 0 && (
            <div className="flex gap-2 flex-wrap pt-1">
              {report.comparedAfter.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="Return" className="w-20 h-20 object-cover rounded border" />
                </a>
              ))}
            </div>
          )}
          <p className="text-xs opacity-70">
            Checked {new Date(report.checkedAt).toLocaleString('en-IN')}
          </p>
        </div>
      )}
    </div>
  );
};

export default DamageCheck;
