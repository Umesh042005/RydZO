import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FiCpu } from 'react-icons/fi';
import api from '../../services/api';
import { aiErrorMessage, AI_TIMEOUT_MS } from '../../services/ai';

const DOC_LABELS = { rc: 'RC', insurance: 'Insurance', puc: 'PUC' };
const STATUS_STYLES = {
  ok: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  review: 'bg-amber-50 border-amber-200 text-amber-900',
  missing: 'bg-neutral-50 border-neutral-200 text-neutral-600',
  unreadable: 'bg-neutral-50 border-neutral-200 text-neutral-600'
};

const Extracted = ({ data }) => {
  if (!data) return null;
  const rows = [
    ['Type', data.documentType],
    ['Reg. no.', data.registrationNumber],
    ['Licence no.', data.licenceNumber],
    ['Name', data.name],
    ['Expiry', data.expiryDate]
  ].filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <p className="text-[11px] text-neutral-600 mt-1">
      {rows.map(([k, v]) => `${k}: ${v}`).join(' · ')}
    </p>
  );
};

// Admin helper: AI reads uploaded documents and lists mismatches to double-check.
// type 'bike' checks RC / insurance / PUC; type 'customer' checks the driving licence.
const AIDocumentCheck = ({ type, id }) => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setRunning(true);
    try {
      const url = type === 'bike' ? `/api/ai/bikes/${id}/document-check` : `/api/ai/users/${id}/license-check`;
      const { data } = await api.post(url, {}, { timeout: AI_TIMEOUT_MS });
      setResult(data);
    } catch (error) {
      toast.error(aiErrorMessage(error, 'Document check failed'));
    } finally {
      setRunning(false);
    }
  };

  const rows = result
    ? type === 'bike'
      ? result.results.map((r) => ({ label: DOC_LABELS[r.document] || r.document, ...r }))
      : [{ label: 'Driving Licence', status: result.overall, flags: result.flags, extracted: result.extracted }]
    : [];

  return (
    <div className="p-4 rounded-2xl border border-primary-200 bg-primary-50/40 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary-900 flex items-center gap-1.5">
            <FiCpu /> AI Document Check
          </h4>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Reads the documents and flags mismatches. Always confirm by eye before approving.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold disabled:opacity-50 whitespace-nowrap"
        >
          {running ? 'Reading…' : result ? 'Run again' : 'Run check'}
        </button>
      </div>

      {rows.map((row) => (
        <div key={row.label} className={`p-3 rounded-xl border text-xs ${STATUS_STYLES[row.status] || STATUS_STYLES.review}`}>
          <p className="font-bold">
            {row.label}: {row.status === 'ok' ? 'Looks consistent' : row.status === 'review' ? 'Needs review' : row.status}
          </p>
          {row.flags?.length > 0 && (
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {row.flags.map((flag, i) => <li key={i}>{flag}</li>)}
            </ul>
          )}
          <Extracted data={row.extracted} />
        </div>
      ))}
    </div>
  );
};

export default AIDocumentCheck;
