import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleAuthButton from '../components/GoogleAuthButton';
import Navbar from "../components/Navbar";
import { FiUser, FiMail, FiPhone, FiLock } from "react-icons/fi";
import toast from "react-hot-toast";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // ✅ Validation function
  const validate = (name, value) => {
    let error = "";

    if (name === "name") {
       if (!value.trim()) {
    error = "Name is required";
        } else if (/\d/.test(value)) {
       error = "Name should not contain numbers";
        }
    }


    if (name === "phone") {
      if (!value) error = "Phone number is required";
      else if (value.length !== 10)
        error = "Phone number must be 10 digits";
    }

    if (
      name === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      error = "Invalid email address";
    }

    if (name === "password") {
      if (value.length < 6)
        error = "Password must be at least 6 characters";
    }

    if (
      name === "confirmPassword" &&
      value !== formData.password
    ) {
      error = "Passwords don't match";
    }

    return error;
  };

  // ✅ Change handler
  const handleChange = (e) => {
    const { name, value } = e.target;

    // phone → only numbers
    if (name === "phone" && !/^\d*$/.test(value)) return;
    if (name === "name" && !/^[a-zA-Z\s]*$/.test(value)) return;


    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: validate(name, value) });
  };

  // ✅ Blur handler
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    setErrors({ ...errors, [name]: validate(name, value) });
  };

  // ✅ Submit
  const handleRegister = async (e) => {
    e.preventDefault();

    // final safety check
    for (let key in formData) {
      if (validate(key, formData[key])) {
        toast.error("Please fix the errors");
        return;
      }
    }

    setLoading(true);
    const result = await register(formData);

    if (result.success) {
      toast.success("Registration successful!");
      navigate("/dashboard");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="max-w-md mx-auto px-4 py-12">
        <div className="card">
          <h2 className="text-3xl font-bold text-center mb-8">
            Create Account
          </h2>

          <form onSubmit={handleRegister} className="space-y-6">
            {/* NAME */}
            <InputField
              label="Full Name"
              icon={<FiUser />}
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.name}
              touched={touched.name}
            />

            {/* PHONE */}
            <InputField
              label="Phone Number"
              icon={<FiPhone />}
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.phone}
              touched={touched.phone}
              maxLength={10}
              inputMode="numeric"
            />

            {/* EMAIL */}
            <InputField
              label="Email Address"
              icon={<FiMail />}
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              touched={touched.email}
              type="email"
            />

            {/* ROLE */}
            <div>
              <label className="block text-sm font-medium mb-2">
                I want to
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange} 
                className="input-field"
              >
                <option value="customer">Rent Bikes</option>
                <option value="owner">List Your Bike</option>
              </select>
            </div>

            {/* PASSWORD */}
            <InputField
              label="Password"
              icon={<FiLock />}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              touched={touched.password}
            />

            {/* CONFIRM PASSWORD */}
            <InputField
              label="Confirm Password"
              icon={<FiLock />}
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.confirmPassword}
              touched={touched.confirmPassword}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <GoogleAuthButton role={formData.role} text="signup_with" />
          {process.env.REACT_APP_GOOGLE_CLIENT_ID && (
            <p className="mt-3 text-center text-xs text-neutral-500">
              With Google you sign up as {formData.role === 'owner' ? 'a bike owner' : 'a rider'} (change it in "I want to" above).
              {formData.role !== 'owner' && ' We ask for your licence and ID when you make your first booking.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;

/* 🔹 Reusable Input Component */
const InputField = ({
  label,
  icon,
  error,
  touched,
  ...props
}) => (
  <div>
    <label className="block text-sm font-medium mb-2">
      {label}
    </label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </span>
      <input
        {...props}
        className={`input-field pl-10 ${
          touched && (error ? "border-red-500" : "border-green-500")
        }`}
      />
    </div>
    {touched && error && (
      <p className="text-red-500 text-sm mt-1">{error}</p>
    )}
  </div>
);
