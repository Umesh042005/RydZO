// What a customer must provide before they can send a booking request.
// Admin approval is NOT needed to book: it is needed before the owner can accept
// the request or start the ride (see bookingController).
const BOOKING_REQUIREMENTS = {
  phone: 'Phone number',
  drivingLicense: 'Driving licence',
  aadhaar: 'Aadhaar card',
  selfie: 'Selfie'
};

const missingBookingDocs = (user) => {
  const missing = [];
  if (!user?.phone) missing.push('phone');
  if (!user?.drivingLicense?.documentUrl || !user?.drivingLicense?.number) missing.push('drivingLicense');
  if (!user?.aadhaarDocumentUrl) missing.push('aadhaar');
  if (!user?.selfieUrl) missing.push('selfie');
  return missing;
};

const isCustomerApproved = (user) => user?.customerApprovalStatus === 'approved';

module.exports = { BOOKING_REQUIREMENTS, missingBookingDocs, isCustomerApproved };
