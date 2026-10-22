const Bike = require('../models/Bike');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { uploadToCloudinary } = require('../utils/cloudinary');
const {
  AI_ENABLED,
  AI_MODEL,
  AI_VISION_MODEL,
  AIUnavailableError,
  chat,
  askJSON,
  cleanText,
  imageFromUrl
} = require('../utils/aiClient');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeId = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const sendError = (res, error, label) => {
  if (error instanceof AIUnavailableError) {
    return res.status(503).json({ message: error.message });
  }
  console.error(`${label} error:`, error);
  return res.status(500).json({ message: 'AI request failed. Please try again.' });
};

// @desc    Tell the frontend whether to show AI features
// @route   GET /api/ai/status
// @access  Public
exports.getStatus = (req, res) => {
  res.json({ enabled: AI_ENABLED, model: AI_MODEL, visionModel: AI_VISION_MODEL });
};

/* ------------------------------------------------------------------ */
/* Listing assistant                                                   */
/* ------------------------------------------------------------------ */

// @desc    Draft a bike description and suggest prices from similar listings
// @route   POST /api/ai/listing-assist
// @access  Private (Owner)
exports.listingAssist = async (req, res) => {
  try {
    const { brand, model, manufacturingYear, mileage, condition, notes } = req.body;
    if (!brand || !model) {
      return res.status(400).json({ message: 'Enter the brand and model first' });
    }

    // Comparable approved bikes: same brand+model first, then same brand, then anything.
    const base = { approvalStatus: 'approved', status: 'active' };
    let comparables = await Bike.find({
      ...base,
      brand: { $regex: `^${escapeRegex(brand.trim())}$`, $options: 'i' },
      model: { $regex: escapeRegex(model.trim()), $options: 'i' }
    }).select('brand model manufacturingYear condition pricing').limit(20).lean();
    if (comparables.length < 3) {
      comparables = await Bike.find({
        ...base,
        brand: { $regex: `^${escapeRegex(brand.trim())}$`, $options: 'i' }
      }).select('brand model manufacturingYear condition pricing').limit(20).lean();
    }
    if (comparables.length < 3) {
      comparables = await Bike.find(base)
        .select('brand model manufacturingYear condition pricing')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    }

    const marketHourly = median(comparables.map((b) => b.pricing?.hourly).filter((n) => n > 0));
    const marketDaily = median(comparables.map((b) => b.pricing?.daily).filter((n) => n > 0));
    const comparableLines = comparables
      .map((b) => `- ${b.brand} ${b.model} (${b.manufacturingYear}, ${b.condition}): ₹${b.pricing?.hourly}/hr, ₹${b.pricing?.daily}/day`)
      .join('\n');

    const result = await askJSON({
      system:
        'You help bike owners in India list two-wheelers on RydZO, a peer-to-peer bike rental app. ' +
        'Write honest, friendly listing copy and realistic rental prices in Indian rupees.',
      prompt: `Bike: ${brand} ${model}
Manufacturing year: ${manufacturingYear || 'unknown'}
Odometer: ${mileage ? `${mileage} km` : 'unknown'}
Condition: ${condition || 'unknown'}
Owner notes: ${String(notes || '').slice(0, 500) || 'none'}

Similar bikes already listed on RydZO:
${comparableLines || '(none yet)'}

Return JSON:
{
  "description": "3-4 sentences for renters: riding feel, best use (city commute, highway, etc.), odometer reading and condition. Only use facts given above: do not state engine cc, power, top speed or fuel economy numbers, and no made-up features.",
  "suggestedHourly": number,
  "suggestedDaily": number,
  "reasoning": "one sentence on how you priced it"
}`
    });

    if (!result?.description) {
      return res.status(502).json({ message: 'AI returned an unexpected answer. Try again.' });
    }

    res.json({
      description: String(result.description).trim(),
      suggestedHourly: toNumber(result.suggestedHourly) || marketHourly,
      suggestedDaily: toNumber(result.suggestedDaily) || marketDaily,
      reasoning: result.reasoning ? String(result.reasoning) : '',
      market: { hourly: marketHourly, daily: marketDaily, comparables: comparables.length }
    });
  } catch (error) {
    sendError(res, error, 'Listing assist');
  }
};

/* ------------------------------------------------------------------ */
/* Document checks (admin)                                             */
/* ------------------------------------------------------------------ */

const sameDay = (a, b) => a && b && new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);
const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

async function readDocument(url, kind) {
  const image = await imageFromUrl(url);
  if (!image) return { readable: false, reason: 'Not an image (PDF or unreadable) — check manually' };
  const extracted = await askJSON({
    images: [image],
    system: 'You read Indian vehicle and identity documents for a verification team. Copy values exactly as printed; use null when a value is not visible.',
    prompt: `This should be a ${kind}. Return JSON:
{
  "documentType": "what the document actually is (e.g. RC, insurance policy, PUC certificate, driving licence, other)",
  "registrationNumber": "vehicle registration number or null",
  "licenceNumber": "driving licence number or null",
  "name": "owner / holder name or null",
  "expiryDate": "validity / expiry date as YYYY-MM-DD or null",
  "readable": true or false,
  "concerns": ["anything suspicious: blurry, edited, cropped, wrong document type"]
}`
  });
  if (!extracted) return { readable: false, reason: 'AI could not read this document' };
  return extracted;
}

// @desc    Read a bike's RC / insurance / PUC and flag mismatches
// @route   POST /api/ai/bikes/:id/document-check
// @access  Private (Admin)
exports.bikeDocumentCheck = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const docs = [
      { key: 'rc', kind: 'vehicle Registration Certificate (RC)' },
      { key: 'insurance', kind: 'two-wheeler insurance policy' },
      { key: 'puc', kind: 'Pollution Under Control (PUC) certificate' }
    ];

    const results = [];
    for (const { key, kind } of docs) {
      const doc = bike.documents?.[key];
      if (!doc?.documentUrl) {
        results.push({ document: key, status: 'missing', flags: ['Not uploaded'] });
        continue;
      }

      const extracted = await readDocument(doc.documentUrl, kind);
      const flags = [];
      if (extracted.readable === false) {
        results.push({ document: key, status: 'unreadable', flags: [extracted.reason || 'Unreadable'], extracted });
        continue;
      }

      if (extracted.registrationNumber && normalizeId(extracted.registrationNumber) !== normalizeId(bike.bikeNumber)) {
        flags.push(`Registration number on document (${extracted.registrationNumber}) does not match listing (${bike.bikeNumber})`);
      }
      if (!extracted.registrationNumber && key !== 'insurance') {
        flags.push('Registration number not visible');
      }
      const expiry = parseDate(extracted.expiryDate);
      if (key !== 'rc') {
        if (!expiry) flags.push('Expiry date not visible');
        else if (expiry < new Date()) flags.push(`Expired on ${expiry.toISOString().slice(0, 10)}`);
        if (expiry && doc.expiryDate && !sameDay(expiry, doc.expiryDate)) {
          flags.push(`Expiry on document (${expiry.toISOString().slice(0, 10)}) differs from owner-entered date (${new Date(doc.expiryDate).toISOString().slice(0, 10)})`);
        }
      }
      for (const concern of Array.isArray(extracted.concerns) ? extracted.concerns : []) {
        if (concern) flags.push(String(concern));
      }

      results.push({ document: key, status: flags.length ? 'review' : 'ok', flags, extracted });
    }

    res.json({
      checkedAt: new Date(),
      overall: results.every((r) => r.status === 'ok') ? 'ok' : 'review',
      results
    });
  } catch (error) {
    sendError(res, error, 'Bike document check');
  }
};

// @desc    Read a customer's driving licence and compare with their profile
// @route   POST /api/ai/users/:id/license-check
// @access  Private (Admin)
exports.licenseCheck = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const url = user.drivingLicense?.documentUrl;
    if (!url) return res.status(400).json({ message: 'No driving licence uploaded' });

    const extracted = await readDocument(url, 'Indian driving licence');
    if (extracted.readable === false) {
      return res.json({ checkedAt: new Date(), overall: 'review', flags: [extracted.reason], extracted });
    }

    const flags = [];
    if (extracted.licenceNumber && user.drivingLicense?.number &&
      normalizeId(extracted.licenceNumber) !== normalizeId(user.drivingLicense.number)) {
      flags.push(`Licence number on document (${extracted.licenceNumber}) does not match profile (${user.drivingLicense.number})`);
    }
    if (!extracted.licenceNumber) flags.push('Licence number not visible');
    if (extracted.name && user.name) {
      const docName = normalizeId(extracted.name);
      const profileName = normalizeId(user.name);
      if (!docName.includes(profileName) && !profileName.includes(docName)) {
        flags.push(`Name on licence (${extracted.name}) differs from profile name (${user.name})`);
      }
    }
    const expiry = parseDate(extracted.expiryDate);
    if (!expiry) flags.push('Expiry date not visible');
    else if (expiry < new Date()) flags.push(`Licence expired on ${expiry.toISOString().slice(0, 10)}`);
    for (const concern of Array.isArray(extracted.concerns) ? extracted.concerns : []) {
      if (concern) flags.push(String(concern));
    }

    res.json({ checkedAt: new Date(), overall: flags.length ? 'review' : 'ok', flags, extracted });
  } catch (error) {
    sendError(res, error, 'Licence check');
  }
};

/* ------------------------------------------------------------------ */
/* Damage check (return photos vs. before photos)                      */
/* ------------------------------------------------------------------ */

// @desc    Upload return photos and have AI compare them with the bike's before photos
// @route   POST /api/ai/bookings/:id/damage-check
// @access  Private (Owner of the booking or Admin)
exports.damageCheck = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('bike');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.user.role !== 'admin' && booking.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the bike owner can run a damage check' });
    }
    if (!['ongoing', 'completed', 'disputed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Damage check is available once the ride has started' });
    }

    // Compare against handover photos when they exist, else the listing photos.
    const bikeImages = booking.bike?.images || {};
    const beforeUrls = (booking.damageProof.startPhotos?.length
      ? booking.damageProof.startPhotos
      : [bikeImages.frontView, bikeImages.sideView, bikeImages.backView, bikeImages.scratches]
    ).filter(Boolean).slice(0, 4);
    const before = (await Promise.all(beforeUrls.map(imageFromUrl))).filter(Boolean);
    if (!before.length) {
      return res.status(400).json({ message: 'No readable "before" photos of this bike to compare against' });
    }

    // New return photos are optional on a re-run; earlier ones are reused.
    const newUrls = [];
    for (const file of req.files || []) {
      const result = await uploadToCloudinary(file.path, `rydzo/bookings/${booking._id}/return`);
      newUrls.push(result.secure_url);
    }
    if (newUrls.length) {
      booking.damageProof.endPhotos = [...(booking.damageProof.endPhotos || []), ...newUrls].slice(-6);
      await booking.save();
    }
    const afterUrls = (booking.damageProof.endPhotos || []).slice(-4);
    if (!afterUrls.length) {
      return res.status(400).json({ message: 'Upload at least one photo of the returned bike' });
    }
    const after = (await Promise.all(afterUrls.map(imageFromUrl))).filter(Boolean);
    if (!after.length) {
      return res.status(400).json({ message: 'Return photos could not be read. Upload JPG or PNG photos.' });
    }

    const bikeName = `${booking.bike?.brand || ''} ${booking.bike?.model || ''}`.trim();
    const report = await askJSON({
      images: [...before, ...after],
      system:
        'You inspect rental two-wheelers in India for new damage. Compare BEFORE photos (taken when the bike was listed/handed over) ' +
        'with AFTER photos (taken at return). Only report damage visible in AFTER that is not in BEFORE. ' +
        'Ignore differences caused by lighting, angle, dirt or reflections. If unsure, say so instead of guessing.',
      prompt: `Photos of a ${bikeName}. The first ${before.length} image(s) are BEFORE photos; the last ${after.length} image(s) are AFTER photos (at return).
Return JSON:
{
  "newDamageFound": true or false,
  "severity": "none" | "minor" | "moderate" | "severe",
  "confidence": "low" | "medium" | "high",
  "findings": [{ "area": "e.g. front mudguard, left side panel", "description": "what changed" }],
  "estimatedRepairCostINR": number (0 if none; typical Indian workshop prices),
  "summary": "2 sentences for the owner and admin"
}`
    });

    if (!report) {
      return res.status(502).json({ message: 'AI returned an unexpected answer. Try again.' });
    }

    booking.damageProof.aiReport = {
      newDamageFound: Boolean(report.newDamageFound),
      severity: ['none', 'minor', 'moderate', 'severe'].includes(report.severity) ? report.severity : 'none',
      confidence: ['low', 'medium', 'high'].includes(report.confidence) ? report.confidence : 'low',
      findings: (Array.isArray(report.findings) ? report.findings : []).slice(0, 10).map((f) => ({
        area: String(f?.area || ''),
        description: String(f?.description || '')
      })),
      estimatedRepairCost: Number(report.estimatedRepairCostINR) || 0,
      summary: String(report.summary || ''),
      comparedBefore: beforeUrls,
      comparedAfter: afterUrls,
      model: AI_VISION_MODEL,
      checkedAt: new Date()
    };
    booking.updatedAt = new Date();
    await booking.save();

    res.json({ report: booking.damageProof.aiReport, endPhotos: booking.damageProof.endPhotos });
  } catch (error) {
    sendError(res, error, 'Damage check');
  }
};

/* ------------------------------------------------------------------ */
/* Ride assistant chat                                                 */
/* ------------------------------------------------------------------ */

const PUBLIC_BIKE_FIELDS = 'brand model manufacturingYear mileage condition description pricing images.frontView handoverLocation.address';

const toBikeCard = (b) => ({
  _id: b._id,
  brand: b.brand,
  model: b.model,
  manufacturingYear: b.manufacturingYear,
  condition: b.condition,
  pricing: b.pricing,
  address: b.handoverLocation?.address || '',
  image: b.images?.frontView || null
});

const CHAT_TOOLS = [
  {
    name: 'search_bikes',
    description:
      'Search bikes that are approved and available to rent on RydZO right now. All filters are optional. ' +
      'Prices are in INR. Use this whenever the user wants to find, compare or price bikes.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Brand or model words, e.g. "activa", "royal enfield classic"' },
        location: { type: 'string', description: 'Area or city words to match in the pickup address, e.g. "koramangala"' },
        maxHourly: { type: 'number', description: 'Maximum price per hour' },
        maxDaily: { type: 'number', description: 'Maximum price per day' },
        condition: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'] }
      }
    }
  },
  {
    name: 'get_bike_details',
    description: 'Get full public details of one bike by its id (from search_bikes results).',
    parameters: {
      type: 'object',
      properties: { bikeId: { type: 'string' } },
      required: ['bikeId']
    }
  }
].map((fn) => ({ type: 'function', function: fn }));

// Tool arguments arrive as an object, but some models send a JSON string.
const toolArgs = (args) => {
  if (args && typeof args === 'object') return args;
  try {
    return JSON.parse(args || '{}');
  } catch {
    return {};
  }
};

async function runChatTool(name, input, found) {
  if (name === 'search_bikes') {
    const query = { approvalStatus: 'approved', isAvailable: true, status: 'active' };
    if (input.query) {
      const words = String(input.query).split(/\s+/).filter(Boolean).slice(0, 4);
      query.$and = words.map((w) => ({
        $or: [
          { brand: { $regex: escapeRegex(w), $options: 'i' } },
          { model: { $regex: escapeRegex(w), $options: 'i' } }
        ]
      }));
    }
    if (input.location) {
      query['handoverLocation.address'] = { $regex: escapeRegex(String(input.location).slice(0, 60)), $options: 'i' };
    }
    if (toNumber(input.maxHourly)) query['pricing.hourly'] = { $lte: toNumber(input.maxHourly) };
    if (toNumber(input.maxDaily)) query['pricing.daily'] = { $lte: toNumber(input.maxDaily) };
    if (['excellent', 'good', 'fair', 'poor'].includes(input.condition)) query.condition = input.condition;

    const bikes = await Bike.find(query).select(PUBLIC_BIKE_FIELDS).sort({ 'pricing.daily': 1 }).limit(8).lean();
    bikes.forEach((b) => found.set(String(b._id), toBikeCard(b)));
    return bikes.length
      ? bikes.map((b) => ({ id: String(b._id), ...toBikeCard(b), _id: undefined, image: undefined }))
      : { results: [], note: 'No bikes match. Suggest loosening the filters.' };
  }

  if (name === 'get_bike_details') {
    if (!/^[a-f\d]{24}$/i.test(String(input.bikeId || ''))) return { error: 'Invalid bike id' };
    const bike = await Bike.findOne({ _id: input.bikeId, approvalStatus: 'approved', status: 'active' })
      .select(`${PUBLIC_BIKE_FIELDS} isAvailable documents.insurance.expiryDate`)
      .lean();
    if (!bike) return { error: 'Bike not found' };
    found.set(String(bike._id), toBikeCard(bike));
    const insuranceValid = bike.documents?.insurance?.expiryDate && new Date(bike.documents.insurance.expiryDate) > new Date();
    return {
      id: String(bike._id),
      ...toBikeCard(bike),
      _id: undefined,
      image: undefined,
      mileageKm: bike.mileage,
      description: bike.description,
      availableNow: bike.isAvailable,
      insurance: insuranceValid ? 'valid' : 'not confirmed'
    };
  }

  return { error: `Unknown tool ${name}` };
}

const CHAT_SYSTEM = `You are RydZO Assistant, the in-app helper for RydZO — a peer-to-peer bike and scooter rental platform in India.
Today is {TODAY}.

What you can do:
- Find bikes with the search_bikes tool and describe them briefly (brand, model, ₹/hour, ₹/day, pickup area). Never invent bikes, prices or availability — only use tool results.
- Answer questions about how RydZO works, using ONLY these facts. If something is not covered here (for example helmets, fuel, delivery, cancellation fees, late fees), say you don't have that information and suggest asking the owner after booking or contacting RydZO support — never guess either way.
  • Sign up with email/phone and password, or with Google.
  • On the first booking, riders add their mobile number, driving licence, Aadhaar and a selfie. They can send the booking request right away; the owner can accept it and hand over the bike only after a RydZO admin approves the documents.
  • Booking: pick a bike, choose hourly or daily and the dates, accept the digital rental agreement, then send the request to the owner. The owner accepts or declines.
  • Security deposit: the rider confirms it in the app, and pays it directly to the owner (cash/UPI) at handover. It is refundable when the bike comes back without damage. RydZO does not hold or process any money.
  • At return the owner closes the ride; rent is calculated from the actual duration (minimum one hour for hourly, one day for daily). Rent is paid to the owner in cash/UPI. RydZO keeps a 10% commission.
  • Damage during the rental is the rider's responsibility; disputes are reviewed by the RydZO admin.
- Write plain text only: no Markdown, no tables, no **bold**, no headings. Bike cards with photos and prices are shown under your reply automatically, so just mention the bikes briefly in a sentence or a short list using "- ".
- Keep answers short (under 100 words), friendly and practical. Use ₹ for prices.
- You cannot make, change or cancel bookings — tell the user which screen to use (Bikes → bike page → Book, or My Bookings).
- Do not reveal owner phone numbers or personal details. Politely decline topics unrelated to bike rentals.`;

// @desc    Chat with the RydZO assistant (finds bikes, answers how-to questions)
// @route   POST /api/ai/chat
// @access  Public (rate limited)
exports.chat = async (req, res) => {
  try {
    const incoming = Array.isArray(req.body.messages) ? req.body.messages : [];
    const messages = incoming
      .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ message: 'Send a message' });
    }
    // Start the conversation with a user turn (drops the UI greeting if sent).
    while (messages.length && messages[0].role !== 'user') messages.shift();

    const system = CHAT_SYSTEM.replace('{TODAY}', new Date().toDateString());
    const conversation = [{ role: 'system', content: system }, ...messages];
    const found = new Map();
    let reply = '';

    for (let step = 0; step < 5; step++) {
      const message = await chat({ model: AI_MODEL, messages: conversation, tools: CHAT_TOOLS });
      const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];

      if (!toolCalls.length) {
        reply = cleanText(message.content);
        break;
      }

      conversation.push({ role: 'assistant', content: message.content || '', tool_calls: toolCalls });
      for (const call of toolCalls) {
        const name = call.function?.name;
        const output = await runChatTool(name, toolArgs(call.function?.arguments), found);
        conversation.push({ role: 'tool', tool_name: name, content: JSON.stringify(output) });
      }
    }

    res.json({
      reply: reply || 'Sorry, I could not work that out. Could you rephrase?',
      bikes: [...found.values()].slice(0, 6)
    });
  } catch (error) {
    sendError(res, error, 'AI chat');
  }
};
