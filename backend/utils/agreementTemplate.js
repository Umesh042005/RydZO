function formatTime12Hour(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const trimmed = timeStr.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return trimmed;
}

function formatBookingDate(dateVal) {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTimeIST(dateVal, timeStr) {
  if (!dateVal && !timeStr) return '—';

  let formattedTime = formatTime12Hour(timeStr);

  if (dateVal) {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const dateText = formatBookingDate(d);
      if (!formattedTime) {
        formattedTime = d.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
      return `${dateText} at ${formattedTime}`;
    }
  }

  return formattedTime || '—';
}

const agreementTemplate = (bookingDetails, bikeDetails, ownerDetails) => {
  const advance = Number(bookingDetails.advancePaymentRequired || 0);
  const startDisplay = formatDateTimeIST(bookingDetails.startTime || bookingDetails.startDate, bookingDetails.startTimeStr);
  const endDisplay = formatDateTimeIST(bookingDetails.endTime || bookingDetails.endDate, bookingDetails.endTimeStr);
  const generatedAt = formatDateTimeIST(bookingDetails.createdAt || new Date());

  return `
DIGITAL RENTAL AGREEMENT - RydZO

This agreement is entered into between:
Owner: ${ownerDetails.name} (${ownerDetails.phone})
Customer: ${bookingDetails.customerName} (${bookingDetails.customerPhone})
Bike: ${bikeDetails.brand} ${bikeDetails.model} (${bikeDetails.bikeNumber})

RENTAL TERMS AND CONDITIONS:

1. RENTAL PERIOD
   - Start Date & Time: ${startDisplay}
   - End Date & Time: ${endDisplay}
   - Duration: ${bookingDetails.duration}

2. ADVANCE PAYMENT (ONLINE)
   - An advance payment of ₹${advance.toFixed(0)} is required to submit the booking request to the owner.
   - Without advance payment, the booking request will not be sent to the owner.

3. LOCATION TRACKING CONSENT
   - I consent to live location tracking via GPS during the rental period
   - Location updates will be sent every 5-10 seconds
   - Tracking will automatically stop when rental ends
   - Geo-fencing rules apply - usage restricted to agreed area

4. BIKE HANDOVER
   - Bike will be provided directly by the owner at agreed location
   - Owner is responsible for physical handover and pickup
   - RydZO is only an aggregator and not responsible for handover

5. INSURANCE STATUS
   - Insurance Status: ${bikeDetails.insuranceStatus}
   ${bikeDetails.insuranceStatus === 'No Insurance' ? 
     '⚠️ WARNING: No Insurance Available. Any damage or repair cost will be borne by the renter.' : 
     'Insurance is available for this vehicle.'}

6. DAMAGE AND REPAIR RESPONSIBILITY
   - Customer is responsible for any damage caused during rental period
   - Customer must upload bike photos at rental start and end
   - Any damage will be assessed by comparing before/after photos
   - Repair costs will be deducted from security deposit or charged separately

7. LATE RETURN PENALTY
   - Late return will incur penalty charges
   - Penalty: ₹${bookingDetails.lateReturnPenalty || 500} per hour after scheduled return time

8. THEFT AND SECURITY / CUSTOMER LIABILITY
   - In case of theft, FIR must be filed immediately
   - Customer is responsible for bike security during rental period
   - If the bike is stolen or damaged due to customer negligence, customer will bear the loss/charges
   - If charges are not paid, legal action may be initiated as per applicable law
   - Security deposit: ₹${bookingDetails.securityDeposit}

9. SECURITY DEPOSIT
   - Security deposit of ₹${bookingDetails.securityDeposit} is required
   - Deposit will be refunded after successful return and damage verification
   - Deductions may be made for damages, late returns, or violations

10. PLATFORM DISCLAIMER (OWNER NOT AT FAULT)
   - RydZO acts only as an aggregator/platform
   - Vehicle ownership remains with the owner
   - RydZO is not responsible for vehicle condition, handover, or any incidents
   - Owner is not responsible for any loss/damage caused during the rental period after handover
   - All disputes will be resolved through admin review

11. ACCEPTANCE
    - By accepting this agreement, I confirm I have read and understood all terms
    - I agree to comply with all conditions mentioned above
    - I accept the risks and responsibilities mentioned above
    - I consent to location tracking and geo-fencing

AGREEMENT ID: ${bookingDetails.bookingId}
DATE: ${startDisplay}
Agreement Generated On: ${generatedAt}
  `;
};

module.exports = agreementTemplate;
