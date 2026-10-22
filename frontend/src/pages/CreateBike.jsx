import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LocationSearchInput from '../components/maps/LocationSearchInput';
import GoogleMapView from '../components/maps/GoogleMapView';
import OSMLocationSearchInput from '../components/maps/osm/OSMLocationSearchInput';
import OSMMapView from '../components/maps/osm/OSMMapView';
import { isOsmProvider } from '../config/mapProvider';
import { reverseGeocode } from '../services/osm/osmGeocodingService';
import { useAIEnabled, aiErrorMessage, AI_TIMEOUT_MS } from '../services/ai';

const ActiveLocationSearchInput = isOsmProvider() ? OSMLocationSearchInput : LocationSearchInput;
const ActiveMapView = isOsmProvider() ? OSMMapView : GoogleMapView;

const REQUIRED_IMAGES = ['frontView', 'backView', 'sideView', 'meterPhoto'];
const IMAGE_LABELS = {
  frontView: 'Front View',
  backView: 'Back View',
  sideView: 'Side View',
  meterPhoto: 'Meter / Odometer'
};

const CreateBike = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    bikeNumber: '',
    brand: '',
    model: '',
    manufacturingYear: '',
    mileage: '',
    condition: 'good',
    description: '',
    hourlyPrice: '',
    dailyPrice: '',
    handoverLocation: {
      address: '',
      coordinates: {
        lat: null,
        lng: null
      }
    }
  });
  const [images, setImages] = useState({
    frontView: null,
    backView: null,
    sideView: null,
    meterPhoto: null,
    scratches: null
  });


  // Bike papers: RC is required, insurance and PUC are optional (with expiry dates)
  const [docs, setDocs] = useState({ rc: null, insurance: null, puc: null });
  const [docExpiry, setDocExpiry] = useState({ insurance: '', puc: '' });

const [uploading, setUploading] = useState({});
  const [loading, setLoading] = useState(false);
  const [createdBikeId, setCreatedBikeId] = useState(null);
  const aiEnabled = useAIEnabled();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const handleAIAssist = async () => {
    if (!formData.brand.trim() || !formData.model.trim()) {
      toast.error('Enter the brand and model first');
      return;
    }
    setAiLoading(true);
    try {
      const { data } = await api.post('/api/ai/listing-assist', {
        brand: formData.brand,
        model: formData.model,
        manufacturingYear: formData.manufacturingYear,
        mileage: formData.mileage,
        condition: formData.condition,
        notes: formData.description
      }, { timeout: AI_TIMEOUT_MS });
      setFormData(prev => ({ ...prev, description: data.description }));
      setAiSuggestion(data);
      toast.success('Description drafted. Review it before saving.');
    } catch (error) {
      toast.error(aiErrorMessage(error, 'Could not generate a description'));
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestedPrices = () => {
    setFormData(prev => ({
      ...prev,
      hourlyPrice: aiSuggestion.suggestedHourly ?? prev.hourlyPrice,
      dailyPrice: aiSuggestion.suggestedDaily ?? prev.dailyPrice
    }));
  };

   const handleImageSelect = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [key]: true }));

    setTimeout(() => {
      setImages(prev => ({ ...prev, [key]: file }));
      setUploading(prev => ({ ...prev, [key]: false }));
    }, 1200);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleLocationSelect = (location) => {
    setFormData(prev => ({
      ...prev,
      handoverLocation: {
        address: location.address || '',
        coordinates: {
          lat: location.coordinates?.lat != null ? Number(location.coordinates.lat) : null,
          lng: location.coordinates?.lng != null ? Number(location.coordinates.lng) : null
        }
      }
    }));
  };

  // Owner fine-tunes the pin on the map: save the exact spot, then refresh the address text
  const handlePinMove = useCallback(async ({ lat, lng }) => {
    setFormData(prev => ({
      ...prev,
      handoverLocation: { ...prev.handoverLocation, coordinates: { lat, lng } }
    }));
    try {
      const { address } = await reverseGeocode(lat, lng);
      if (address) {
        setFormData(prev => {
          const c = prev.handoverLocation.coordinates;
          // Ignore a slow response if the pin has moved again since
          if (c?.lat !== lat || c?.lng !== lng) return prev;
          return { ...prev, handoverLocation: { ...prev.handoverLocation, address } };
        });
      }
    } catch {
      // Keep the previous address text; the coordinates are what matter for the map
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let bikeId = createdBikeId;

      // 1. Validate that location has coordinates
      if (!formData.handoverLocation?.coordinates?.lat || !formData.handoverLocation?.coordinates?.lng) {
        toast.error('Please select a location from the suggestions or click 🎯 to verify coordinates before creating the listing.');
        setLoading(false);
        return;
      }

      // Check required files up front; otherwise the listing is created and then the upload fails
      const missingImages = REQUIRED_IMAGES.filter(key => !images[key]);
      if (missingImages.length > 0) {
        toast.error(`Please upload: ${missingImages.map(key => IMAGE_LABELS[key]).join(', ')}`);
        setLoading(false);
        return;
      }
      if (!docs.rc) {
        toast.error('Please upload the RC (registration certificate)');
        setLoading(false);
        return;
      }

      // 2. Create Bike Listing (Only if not already created)
      if (!bikeId) {
        // Ensure handoverLocation strictly follows { address, coordinates: { lat, lng } }
        const bikePayload = {
          ...formData,
          handoverLocation: {
            address: formData.handoverLocation.address,
            coordinates: {
              lat: formData.handoverLocation.coordinates?.lat != null ? Number(formData.handoverLocation.coordinates.lat) : undefined,
              lng: formData.handoverLocation.coordinates?.lng != null ? Number(formData.handoverLocation.coordinates.lng) : undefined
            }
          }
        };

        const response = await api.post('/api/bikes', bikePayload);
        bikeId = response.data.bike._id;
        setCreatedBikeId(bikeId);
      }

      // 2. Upload Images
      const imageFormData = new FormData();
      const imageTypes = [];

      if (images.frontView) {
        imageFormData.append('images', images.frontView);
        imageTypes.push('frontView');
      }
      if (images.backView) {
        imageFormData.append('images', images.backView);
        imageTypes.push('backView');
      }
      if (images.sideView) {
        imageFormData.append('images', images.sideView);
        imageTypes.push('sideView');
      }
      if (images.meterPhoto) {
        imageFormData.append('images', images.meterPhoto);
        imageTypes.push('meterPhoto');
      }
      if (images.scratches) {
        imageFormData.append('images', images.scratches);
        imageTypes.push('scratches');
      }

      imageFormData.append('imageTypes', JSON.stringify(imageTypes));

      if (imageTypes.length > 0) {
        await api.post(`/api/bikes/${bikeId}/images`, imageFormData);
      }

      // 3. Upload bike documents (RC, Insurance, PUC)
      const docFormData = new FormData();
      const documentTypes = [];
      ['rc', 'insurance', 'puc'].forEach(type => {
        if (docs[type]) {
          docFormData.append('documents', docs[type]);
          documentTypes.push(type);
        }
      });
      docFormData.append('documentTypes', JSON.stringify(documentTypes));
      if (docExpiry.insurance) docFormData.append('insuranceExpiry', docExpiry.insurance);
      if (docExpiry.puc) docFormData.append('pucExpiry', docExpiry.puc);

      if (documentTypes.length > 0) {
        await api.post(`/api/bikes/${bikeId}/documents`, docFormData);
      }

      toast.success('Bike listing created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Submission Error:', error);
      toast.error(error.response?.data?.message || 'Failed to create bike listing. Please try uploading images and documents again.');
    } finally {
      setLoading(false);
    }
  };
  const UploadBox = ({ label, imgKey, required }) => (
  <div>
    <label className="block text-sm font-medium mb-2 text-black">
      {label} {required && '*'}
    </label>

    <input
      type="file"
      accept="image/*"
      id={imgKey}
      hidden
      onChange={(e) => handleImageSelect(e, imgKey)}
    />

    <button
      type="button"
      onClick={() => document.getElementById(imgKey).click()}
      className="w-full flex items-center justify-center gap-2
                 bg-green-900 hover:bg-black text-white
                 py-3 rounded-full transition txt-xl"
    > 
      {uploading[imgKey]
        ? 'Uploading...'
        : images[imgKey]
        ? images[imgKey].name
        : '⬆ Upload'}
    </button>
  </div>
);


  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-neutral-900">List Your Bike</h1>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Bike Number *</label>
              <input
                type="text"
                name="bikeNumber"
                value={formData.bikeNumber}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., MH12AB1234"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Brand *</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Honda"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Model *</label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Activa"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Manufacturing Year *</label>
              <input
                type="number"
                name="manufacturingYear"
                value={formData.manufacturingYear}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., 2020"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Mileage (km) *</label>
              <input
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., 15000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Condition *</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Description</label>
              {aiEnabled && (
                <button
                  type="button"
                  onClick={handleAIAssist}
                  disabled={aiLoading}
                  className="text-sm font-semibold text-primary-700 hover:text-primary-900 disabled:opacity-50"
                >
                  {aiLoading ? 'Writing…' : '✨ Write with AI + suggest price'}
                </button>
              )}
            </div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input-field"
              rows="4"
              placeholder="Describe your bike... (or type a few notes and let AI write it)"
            />
          </div>

          {aiSuggestion && (aiSuggestion.suggestedHourly || aiSuggestion.suggestedDaily) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-primary-50 border border-primary-200 text-sm">
              <div>
                <p className="font-semibold text-primary-900">
                  AI suggested price: ₹{aiSuggestion.suggestedHourly ?? '—'}/hour · ₹{aiSuggestion.suggestedDaily ?? '—'}/day
                </p>
                {aiSuggestion.reasoning && <p className="text-neutral-600 mt-1">{aiSuggestion.reasoning}</p>}
                {aiSuggestion.market?.comparables > 0 && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Based on {aiSuggestion.market.comparables} similar listings (median ₹{aiSuggestion.market.hourly}/hr, ₹{aiSuggestion.market.daily}/day)
                  </p>
                )}
              </div>
              <button type="button" onClick={applySuggestedPrices} className="btn-secondary whitespace-nowrap">
                Use these prices
              </button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Hourly Price (₹) *</label>
              <input
                type="number"
                name="hourlyPrice"
                value={formData.hourlyPrice}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., 100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Daily Price (₹) *</label>
              <input
                type="number"
                name="dailyPrice"
                value={formData.dailyPrice}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., 800"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Handover Location Address *</label>
            <ActiveLocationSearchInput
              value={formData.handoverLocation.address}
              onLocationSelect={handleLocationSelect}
              placeholder="Search pickup location or address..."
              coordinates={formData.handoverLocation.coordinates}
              required
            />
            {formData.handoverLocation.coordinates?.lat != null &&
             formData.handoverLocation.coordinates?.lng != null && (
              <div className="mt-3">
                <ActiveMapView
                  coordinates={formData.handoverLocation.coordinates}
                  address={formData.handoverLocation.address}
                  height="280px"
                  onPositionChange={isOsmProvider() ? handlePinMove : undefined}
                />
              </div>
            )}
          </div>

          <div className="border-t border-green-600 pt-6">
  <h3 className="text-lg font-semibold mb-4 text-black">
    Upload Bike Images
  </h3>

  <p className="text-sm text-green-700 mb-4">
    Please upload clear images of your bike. Front, Back, Side, and Meter photos are required.
  </p>

  <div className="grid md:grid-cols-2 gap-6">
    <UploadBox label="Front View" imgKey="frontView" required />
    <UploadBox label="Back View" imgKey="backView" required />
    <UploadBox label="Side View" imgKey="sideView" required />
    <UploadBox label="Meter / Odometer" imgKey="meterPhoto" required />
    <UploadBox label="Scratches (Optional)" imgKey="scratches" />
  </div>
</div>

          <div className="border-t border-green-600 pt-6">
            <h3 className="text-lg font-semibold mb-4 text-black">Upload Bike Documents</h3>
            <p className="text-sm text-green-700 mb-4">
              RC is required. Insurance and PUC are optional, but customers see whether the bike is insured.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { type: 'rc', label: 'RC (Registration Certificate) *' },
                { type: 'insurance', label: 'Insurance (Optional)' },
                { type: 'puc', label: 'PUC (Optional)' }
              ].map(({ type, label }) => (
                <div key={type}>
                  <label className="block text-sm font-medium mb-2 text-black">{label}</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setDocs(prev => ({ ...prev, [type]: e.target.files[0] || null }))}
                    className="input-field"
                  />
                  {type !== 'rc' && docs[type] && (
                    <div className="mt-2">
                      <label className="block text-xs text-neutral-600 mb-1">Expiry date</label>
                      <input
                        type="date"
                        value={docExpiry[type]}
                        onChange={(e) => setDocExpiry(prev => ({ ...prev, [type]: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>


          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50"
          >
            {loading ? 'Processing...' : (createdBikeId ? 'Retry Upload' : 'Create Listing')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateBike;
