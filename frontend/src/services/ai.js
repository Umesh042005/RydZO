import { useEffect, useState } from 'react';
import api from './api';

// Local models can take a while, especially for photo checks.
export const AI_TIMEOUT_MS = 180000;

let statusPromise = null;
const fetchStatus = () => {
  if (!statusPromise) {
    statusPromise = api
      .get('/api/ai/status')
      .then((res) => Boolean(res.data?.enabled))
      .catch(() => false);
  }
  return statusPromise;
};

// True once the backend reports AI features are switched on; hides AI UI otherwise.
export const useAIEnabled = () => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    fetchStatus().then((value) => active && setEnabled(value));
    return () => {
      active = false;
    };
  }, []);
  return enabled;
};

export const aiErrorMessage = (error, fallback = 'AI request failed') => {
  if (error?.code === 'ECONNABORTED') return 'AI took too long to answer. Try again.';
  return error?.response?.data?.message || fallback;
};
