# RYDZO - Bike Rental Platform

## Project Overview

RYDZO is a secure and reliable bike rental aggregator platform designed to connect bike owners with customers. It facilitates seamless booking, identity verification, and secure rental agreements.

This project is built as a college-level submission, focusing on a clean architecture, role-based access control, and essential features for a rental marketplace.

---

## 🚀 Key Features

### Backend (Node.js + Express + MongoDB)
- **Authentication**: Secure JWT-based auth with Role-Based Access Control (RBAC).
- **User Roles**: Separate flows for **Customer**, **Owner**, and **Admin**.
- **Verification System**: Mandatory document uploads (Driving License, Aadhaar, etc.) with Admin approval.
- **Bike Listings**: Owners can list bikes with photos and documents (RC, Insurance).
- **Booking Management**: Complete rental lifecycle (Pending -> Confirmed -> Ongoing -> Completed).
- **Digital Agreement**: Mandatory rental agreement acceptance before booking confirmation.
- **Ride Status**: Simple status tracking for active rentals.

### Frontend (React + Tailwind CSS)
- **Modern UI**: Clean and responsive design using a Purple/Orange color scheme.
- **Dashboard**: Role-specific dashboards for Customers, Owners, and Admins.
- **Browse Bikes**: Search and filter available bikes.
- **Booking Flow**: Easy-to-use booking interface with date/time selection.
- **Profile Management**: Profile updates and document status tracking.

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Tailwind CSS, React Router, React Icons
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JSON Web Tokens (JWT)
- **Image Storage**: Cloudinary (for profile and bike images)

---

## 📂 Project Structure

```
RydZo/
├── backend/
│   ├── models/            # Database schemas (User, Bike, Booking, Agreement)
│   ├── routes/            # API endpoints
│   ├── controllers/       # Business logic
│   ├── middleware/        # Auth and validation middleware
│   └── server.js          # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── context/       # State management (Auth)
│   │   └── App.jsx        # Main React component
│   └── package.json
│
└── README.md              # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (Local or Atlas)
- Cloudinary Account (for image uploads)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd RydZo
    ```

2.  **Install Backend Dependencies:**
    ```bash
    cd backend
    npm install
    ```

3.  **Install Frontend Dependencies:**
    ```bash
    cd ../frontend
    npm install
    ```

4.  **Environment Setup:**
    - Create a `.env` file in the `backend` folder.
    - Add the following variables:
      ```env
      PORT=5000
      MONGODB_URI=your_mongodb_connection_string
      JWT_SECRET=your_jwt_secret
      CLOUDINARY_CLOUD_NAME=your_cloud_name
      CLOUDINARY_API_KEY=your_api_key
      CLOUDINARY_API_SECRET=your_api_secret
      ```
    - Create a `.env` file in the `frontend` folder.
      ```env
      REACT_APP_API_URL=http://localhost:5000
      ```

5.  **Run the Application:**
    - **Backend:** `cd backend && npm run dev`
    - **Frontend:** `cd frontend && npm start`

---

## 🤖 AI Features

| Feature | Who | Where |
|---|---|---|
| **Listing assistant**: writes the bike description and suggests ₹/hour and ₹/day prices from similar listings | Owner | List Your Bike → "✨ Write with AI + suggest price" |
| **Damage check**: compares return photos with the listing/handover photos, flags new damage and estimates repair cost | Owner (admin sees report) | Booking details, once the ride has started |
| **Document check**: reads RC / insurance / PUC and driving licence, flags number, name and expiry mismatches | Admin | Admin panel → bike / customer details → "Run check" |
| **Ride assistant**: chat that searches available bikes and answers booking questions | Customers & visitors | Floating "Ask RydZo AI" button |

The backend talks to the AI through the Ollama chat API. By default it uses **Ollama Cloud**, so nothing has to run locally.

**Setup (Ollama Cloud):**
1. Create a key at <https://ollama.com/settings/keys>.
2. Pick models from <https://ollama.com/search?c=cloud>: one for text and tool calling, and one that accepts images (vision).
3. Add to `backend/.env` and restart the backend:
   ```
   AI_API_URL=https://ollama.com/api/chat
   AI_API_KEY=your-key-here
   AI_MODEL=gpt-oss:20b
   AI_VISION_MODEL=gemma4:31b
   ```

Without `AI_API_KEY` the AI buttons stay hidden. To use a local Ollama instead, set
`AI_API_URL=http://localhost:11434/api/chat` (no key needed). `AI_ENABLED=false` turns all AI features off,
and `AI_TIMEOUT_MS` (default 180000) controls how long to wait for an answer.

Note: the Ollama Cloud free plan runs one request at a time; others wait in a queue.

---

## 📝 Usage Guide

1.  **Register**: Create an account as a "Customer" or "Owner".
2.  **Verify**: Upload required documents in the Profile section. These must be approved by an Admin.
3.  **Owner**: List a bike once verified.
4.  **Customer**: Browse bikes and make a booking request.
5.  **Booking Flow**:
    - Customer sends request.
    - Owner accepts request.
    - Customer accepts Digital Agreement.
    - Owner hands over bike (starts ride).
    - Owner receives bike back (ends ride).

---

## 🔒 Security & Best Practices

- **Data Privacy**: Passwords are hashed using bcrypt.
- **Authorization**: Protected routes ensure users access only permitted features.
- **Validation**: Input validation for all forms and API requests.

---

## 📄 License

This project is created for educational purposes.
