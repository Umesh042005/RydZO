import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiUpload, FiCheckCircle, FiAlertCircle, FiClock, FiEye, FiLogOut } from 'react-icons/fi';
import ProfileAvatar from '../components/ProfileAvatar';

const Profile = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [bookingCount, setBookingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewDoc, setViewDoc] = useState(null); // URL of doc to view

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [profileRes, statusRes, bookingsRes] = await Promise.all([
        api.get('/api/users/profile'),
        user.role === 'customer'
          ? api.get('/api/users/customer/status')
          : user.role === 'owner'
            ? api.get('/api/users/owner/status')
            : Promise.resolve({ data: null }),
        user.role === 'customer'
          ? api.get('/api/bookings/customer')
          : user.role === 'owner'
            ? api.get('/api/bookings/owner')
            : Promise.resolve({ data: [] })
      ]);

      setProfile(profileRes.data);
      if (statusRes.data) {
        setVerificationStatus(statusRes.data);
      }
      if (bookingsRes.data) {
        setBookingCount(bookingsRes.data.length);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileUpload = async (type, file, additionalData = {}) => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    // Determine field name based on type
    const fieldName = type === 'profilePhoto' ? 'profilePhoto' : type === 'selfie' ? 'selfie' : 'document';
    formData.append(fieldName, file);

    // Append additional data
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    try {
      let endpoint = '';
      if (type === 'drivingLicense') {
        endpoint = '/api/users/customer/driving-license';
      } else if (type === 'selfie') {
        endpoint = '/api/users/customer/selfie';
      } else if (type === 'aadhaar' || type === 'pan') {
        // Customer identity documents
        endpoint = '/api/users/customer/identity';
        formData.append('type', type);
      } else if (type === 'profilePhoto') {
        endpoint = '/api/users/customer/profile-photo';
      } else if (type === 'ownerDocuments') {
        endpoint = '/api/users/owner/documents';
        formData.append('documentTypes', JSON.stringify(additionalData.documentTypes || []));
      }

      await api.post(endpoint, formData);
      toast.success('Uploaded successfully!');
      fetchData(); // Refresh data
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FiCheckCircle />;
      case 'rejected': return <FiAlertCircle />;
      case 'pending': return <FiClock />;
      default: return <FiUpload />;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const DocumentCard = ({ title, statusObj, onUpload, type, allowView = true }) => {
    const status = verificationStatus?.approvalStatus === 'approved' ? 'approved' : (statusObj?.status || 'not_uploaded');
    const isUploaded = statusObj?.uploaded;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-neutral-800">{title}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(status)}`}>
            {getStatusIcon(status)}
            {status.toUpperCase().replace('_', ' ')}
          </span>
        </div>

        {status === 'rejected' && statusObj.rejectionReason && (
          <div className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded">
            Reason: {statusObj.rejectionReason}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          {status === 'approved' ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-medium border border-green-200 cursor-default">
              <FiCheckCircle />
              Verified
            </div>
          ) : (
            <>
              <input
                type="file"
                id={`upload-${type}`}
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    if (type === 'drivingLicense' || type === 'aadhaar' || type === 'pan') {
                      // Prompt for number logic is optional but good for user to confirm
                      const number = prompt(`Enter ${title} Number (if applicable):`);
                      if (number !== null) {
                        onUpload(e.target.files[0], { number });
                      }
                    } else {
                      onUpload(e.target.files[0]);
                    }
                  }
                }}
              />
              <label
                htmlFor={`upload-${type}`}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium bg-black text-white hover:bg-gray-800`}
              >
                <FiUpload />
                {isUploaded ? 'Update' : 'Upload'}
              </label>
            </>
          )}

          {isUploaded && allowView && (
            <button
              onClick={() => setViewDoc(statusObj.url)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <FiEye />
            </button>
          )}
        </div>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center items-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
            <p className="text-gray-600">You need to be logged in to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- CUSTOMER VIEW ---
  if (user?.role === 'customer') {
    return (
      <div className="min-h-screen pb-20">
        <Navbar />

        {/* Header */}
        <div className="max-w-md mx-auto mt-8 mb-6 px-4">
          <div className="flex flex-col items-center gap-4">
            <ProfileAvatar name={profile?.name} imageUrl={profile?.profileImage} onUploaded={fetchData} />
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mt-2 
                 ${verificationStatus?.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                  verificationStatus?.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {verificationStatus?.approvalStatus?.toUpperCase() || 'PENDING'}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="px-4 max-w-md mx-auto mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3 border-b pb-2">Personal Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Full Name</span>
                <span className="font-medium">{profile?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{profile?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone Number</span>
                <span className="font-medium">{profile?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <span className="font-medium capitalize">{profile?.role}</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-gray-500 font-bold">Total Bookings</span>
                <span className="text-green-600 font-bold">{bookingCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Section */}
        <div className="px-4 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-4 px-1">Customer Verification</h2>

          <DocumentCard
            title="Aadhaar Card"
            type="aadhaar"
            statusObj={verificationStatus?.aadhaar}
            onUpload={(file, data) => handleFileUpload('aadhaar', file, { number: data?.number })}
          />

          <DocumentCard
            title="PAN Card"
            type="pan"
            statusObj={verificationStatus?.pan}
            onUpload={(file, data) => handleFileUpload('pan', file, { number: data?.number })}
          />

          <DocumentCard
            title="Driving License"
            type="drivingLicense"
            statusObj={verificationStatus?.drivingLicense}
            onUpload={(file, data) => handleFileUpload('drivingLicense', file, { licenseNumber: data?.number })}
          />

          <DocumentCard
            title="Selfie"
            type="selfie"
            statusObj={verificationStatus?.selfie}
            onUpload={(file) => handleFileUpload('selfie', file)}
          />
        </div>

        <div className="px-4 max-w-md mx-auto mt-6 mb-8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-600 border border-green-200 py-3 rounded-xl font-semibold hover:bg-green-100 transition-colors"
          >
            <FiLogOut />
            Sign Out
          </button>
        </div>

        {/* Document Viewer Modal */}
        {viewDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={() => setViewDoc(null)}>
            <div className="max-w-3xl w-full max-h-[90vh] overflow-auto bg-white rounded-lg p-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2 px-2">
                <h3 className="font-bold">Document Preview</h3>
                <button onClick={() => setViewDoc(null)} className="text-red-500 font-bold p-2">Close</button>
              </div>
              {viewDoc.endsWith('.pdf') ? (
                <iframe src={viewDoc} className="w-full h-[60vh]" title="Document PDF"></iframe>
              ) : (
                <img src={viewDoc} alt="Document" className="w-full h-auto rounded" />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- ADMIN VIEW ---
  if (user?.role === 'admin') {
    return (
      <div className="min-h-screen pb-20">
        <Navbar />
        <div className="max-w-md mx-auto mt-12 px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            {/* Profile Photo */}
            <div className="flex justify-center mb-4">
              <ProfileAvatar name={profile?.name} imageUrl={profile?.profileImage} onUploaded={fetchData} />
            </div>

            {/* Name & Email */}
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{profile?.name}</h1>
            <p className="text-gray-500 mb-4">{profile?.email}</p>

            {/* Role Badge */}
            <div className="inline-block px-4 py-1.5 bg-black text-white text-xs font-bold rounded-full mb-8">
              ADMIN
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => toast.error('Change password functionality not yet implemented')}
                className="w-full py-3 px-4 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Change Password
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-50 text-green-600 border border-green-200 rounded-xl font-semibold hover:bg-green-100 transition-colors"
              >
                <FiLogOut />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // --- OWNER VIEW ---
  if (user?.role === 'owner') {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="flex items-center gap-6 mb-8">
            <ProfileAvatar name={profile?.name} imageUrl={profile?.profileImage} onUploaded={fetchData} />
            <div>
              <h1 className="text-4xl font-bold text-neutral-900">{profile?.name}</h1>
              <p className="text-neutral-500">{profile?.email}</p>
              <span className="inline-block px-3 py-1 bg-black text-white text-xs rounded-full mt-2">OWNER</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-xl font-bold mb-4 border-b pb-2">Personal Details</h2>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{profile?.phone}</p>
                <p className="text-sm text-gray-500 mt-2">Address</p>
                <p className="font-medium">{profile?.address?.city || 'Not set'}</p>
                <div className="flex justify-between pt-2 border-t mt-3">
                  <span className="text-gray-500 font-bold text-sm">Total Bookings</span>
                  <span className="text-green-600 font-bold">{bookingCount}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-bold mb-4 border-b pb-2">Verification Status</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-full ${verificationStatus?.isVerified ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  {verificationStatus?.isVerified ? <FiCheckCircle size={24} /> : <FiClock size={24} />}
                </div>
                <div>
                  <p className="font-bold">{verificationStatus?.isVerified ? 'Verified Owner' : 'Pending Verification'}</p>
                  <p className="text-sm text-gray-500">{verificationStatus?.approvalNote || 'Complete all documents to get verified.'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>Aadhaar Card</span>
                  {verificationStatus?.aadhaarUploaded ? (
                    <span className="text-green-600 text-sm font-bold">Uploaded</span>
                  ) : (
                    <label className="cursor-pointer text-sm bg-black text-white px-3 py-1 rounded">
                      Upload
                      <input type="file" className="hidden" onChange={(e) => {
                        const n = prompt('Aadhaar Number:');
                        if (n && e.target.files[0]) handleFileUpload('aadhaar', e.target.files[0], { documentTypes: ['aadhaar'], aadhaarNumber: n });
                      }} />
                    </label>
                  )}
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>PAN Card</span>
                  {verificationStatus?.panUploaded ? (
                    <span className="text-green-600 text-sm font-bold">Uploaded</span>
                  ) : (
                    <label className="cursor-pointer text-sm bg-black text-white px-3 py-1 rounded">
                      Upload
                      <input type="file" className="hidden" onChange={(e) => {
                        const n = prompt('PAN Number:');
                        if (n && e.target.files[0]) handleFileUpload('pan', e.target.files[0], { documentTypes: ['pan'], panNumber: n });
                      }} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-sm"
            >
              <FiLogOut />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null; // Fallback
};

export default Profile;
