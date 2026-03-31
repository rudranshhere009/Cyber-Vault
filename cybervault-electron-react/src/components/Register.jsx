// ... existing imports ...
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { registerUser } from '../utils/api'; // Assuming you have this api function
import { encryptNeuralKey } from '../utils/encryption'; // Assuming you have this encryption function
import FingerprintAuth from './FingerprintAuth';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    neuralPin: '', // Changed from neuralKey to neuralPin
    email: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNeuralPinChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 3) {
      setFormData({ ...formData, neuralPin: value });
    }
  };

  const validateNeuralPin = (pin) => {
    return /^\d{3}$/.test(pin);  // Ensures exactly 3 digits
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateNeuralPin(formData.neuralPin)) {
      toast.error('Neural PIN must be exactly 3 digits');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    // ... other validation logic ...

    try {
      // Assuming registerUser expects an object with username, password, email, and encrypted neuralPin
      await registerUser({
        username: formData.username,
        password: formData.password,
        email: formData.email,
        neuralPin: await encryptNeuralKey(formData.neuralPin) // Encrypt the PIN before sending
      });
      toast.success('Registration successful!');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    }
  };

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <span>👤 USERNAME</span>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="quantum_user_001"
            required
          />
        </div>

        <div className="input-group">
          <span>🔢 NEURAL PIN</span>
          <input
            type="password"
            name="neuralPin"
            maxLength="3"
            pattern="^[0-9]{3}$"
            placeholder="Enter 3-digit PIN"
            value={formData.neuralPin}
            onChange={handleNeuralPinChange}
            required
          />
        </div>

        <div className="input-group">
          <span>🔑 NEURAL KEY (EMAIL)</span>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="quantum.user@cybervault.net"
            required
          />
        </div>

        <div className="input-group">
          <span>🔒 PASSWORD</span>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            required
          />
        </div>

        <div className="input-group">
          <span>🔒 CONFIRM PASSWORD</span>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Confirm your password"
            required
          />
        </div>

        <button type="submit" className="register-button">REGISTER</button>
      </form>

      {/* Fingerprint Registration Section - shown after basic registration */}
      {formData.username && formData.password && (
        <div className="fingerprint-section">
          <h3>🔐 Enhanced Security</h3>
          <p>Add fingerprint authentication for faster, more secure access</p>
          <FingerprintAuth
            username={formData.username}
            masterPassword={formData.password}
            onAuthSuccess={(result) => {
              if (result.type === 'registration') {
                toast.success('Fingerprint registered! You can now use it to login.');
              }
            }}
            onAuthError={(error) => {
              toast.error('Fingerprint registration failed: ' + error.message);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default Register;