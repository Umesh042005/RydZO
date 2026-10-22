import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FiCamera } from 'react-icons/fi';
import api from '../services/api';

const MAX_BYTES = 10 * 1024 * 1024;

// Round profile photo with a camera button to change it. Works for every role.
// Shows the user's initial when there is no photo (or it fails to load).
const ProfileAvatar = ({ name, imageUrl, onUploaded, size = 'w-24 h-24' }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [broken, setBroken] = useState(false);
  const src = preview || imageUrl;
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be picked again
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a JPG, PNG or WEBP image');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Photo is too large (max 10 MB)');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBroken(false);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);
      const { data } = await api.post('/api/users/profile-photo', formData);
      toast.success('Profile photo updated');
      // Keep showing the local preview; the uploaded URL replaces it on the next render.
      setPreview(data.url || localUrl);
      onUploaded?.(data.url);
    } catch (error) {
      setPreview(null);
      toast.error(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`relative ${size} shrink-0`}>
      <div className="w-full h-full rounded-full overflow-hidden border-2 border-primary-500/40 shadow-glow bg-neutral-100 flex items-center justify-center">
        {src && !broken ? (
          <img src={src} alt={name || 'Profile'} className="w-full h-full object-cover" onError={() => setBroken(true)} />
        ) : (
          <span className="font-display text-3xl font-bold text-primary-300">{initial}</span>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-2 border-primary-300 border-t-transparent animate-spin" />
          </div>
        )}
      </div>
      <label
        className={`absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-ink ${uploading ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:scale-105'} transition-transform`}
        title="Change profile photo"
      >
        <FiCamera size={16} />
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleChange} disabled={uploading} />
      </label>
    </div>
  );
};

export default ProfileAvatar;
