import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { FiMail, FiPhone, FiLock } from "react-icons/fi";

const Login = () => {
  const [formData, setFormData] = useState({
    phone: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'owner') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/bikes', { replace: true });
      }
    }
  }, [user, navigate]);

  // ✅ Validation function
  const validate = (name, value) => {
    let error = "";

    if (name === "phone" && value && value.length !== 10) {
      error = "Phone number must be 10 digits";
    }

    if (
      name === "email" &&
      value &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      error = "Invalid email address";
    }

    if (name === "password" && !value) {
      error = "Password is required";
    }

    return error;
  };

  // ✅ Handle change (real-time validation)
  const handleChange = (e) => {
    const { name, value } = e.target;

    // phone → only numbers
    if (name === "phone" && !/^\d*$/.test(value)) return;

    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: validate(name, value) });
  };

  // ✅ Handle blur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    setErrors({ ...errors, [name]: validate(name, value) });
  };

  // ✅ Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone && !formData.email) {
      alert("Please enter either a phone number or an email address");
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      alert("Phone number must be 10 digits");
      return;
    }

    if (!formData.password) {
      alert("Password required");
      return;
    }

    setLoading(true);

    const result = await login(
      formData.phone,
      formData.email,
      formData.password
    );

    if (result.success) {
      if (result.user?.role === 'admin') {
        navigate("/admin", { replace: true });
      } else if (result.user?.role === 'owner') {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/bikes", { replace: true });
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-md mx-auto px-4 py-12">
        <div className="card">
          <h2 className="text-3xl font-bold text-center mb-8">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PHONE */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter phone number"
                  className={`input-field pl-10 ${
                    touched.phone &&
                    (errors.phone
                      ? "border-red-500"
                      : "border-green-500")
                  }`}
                />
              </div>

              {touched.phone && errors.phone && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="text-center text-gray-500">OR</div>

            {/* EMAIL */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter email address"
                  className={`input-field pl-10 ${
                    touched.email &&
                    (errors.email
                      ? "border-red-500"
                      : "border-green-500")
                  }`}
                />
              </div>

              {touched.email && errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.email}
                </p>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter password"
                  className={`input-field pl-10 ${
                    touched.password &&
                    (errors.password
                      ? "border-red-500"
                      : "border-green-500")
                  }`}
                />
              </div>

              {touched.password && errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p>
              Don't have an account?{" "}
              <Link to="/register" className="text-blue-600 font-semibold">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
