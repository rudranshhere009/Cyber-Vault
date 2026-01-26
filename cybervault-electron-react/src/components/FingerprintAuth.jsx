import React, { useState, useEffect } from 'react';
import { 
  loadCredentialStore, 
  addCredential, 
  getUserCredentials,
  generateRegistrationOptions,
  generateAuthenticationOptions,
  updateCredentialUsage,
  arrayBufferToBase64 
} from '../utils/webauthn-storage.js';

const FingerprintAuth = ({ username, masterPassword, onAuthSuccess, onAuthError }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [credentials, setCredentials] = useState([]);

  // Check WebAuthn support and existing credentials on mount
  useEffect(() => {
    checkWebAuthnSupport();
    if (username && masterPassword) {
      loadExistingCredentials();
    }
  }, [username, masterPassword]);

  const checkWebAuthnSupport = () => {
    const supported = window.PublicKeyCredential && 
                     typeof window.PublicKeyCredential === 'function' &&
                     typeof navigator.credentials.create === 'function' &&
                     typeof navigator.credentials.get === 'function';
    
    setIsSupported(supported);
    
    if (!supported) {
      setStatus('WebAuthn not supported in this browser/device');
    }
  };

  const loadExistingCredentials = async () => {
    try {
      const userCreds = await getUserCredentials(username, masterPassword);
      setCredentials(userCreds);
      setHasCredentials(userCreds.length > 0);
      
      if (userCreds.length > 0) {
        setStatus(`${userCreds.length} fingerprint(s) registered`);
      } else {
        setStatus('No fingerprints registered');
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      setStatus('Error loading credentials');
    }
  };

  const handleRegistration = async () => {
    if (!isSupported) {
      setStatus('WebAuthn not supported');
      return;
    }

    setIsLoading(true);
    setStatus('Preparing fingerprint registration...');

    try {
      // Generate registration options
      const options = generateRegistrationOptions(username);
      
      setStatus('Touch your fingerprint sensor or use Windows Hello...');
      
      // Call WebAuthn API to create credential
      const credential = await navigator.credentials.create({
        publicKey: options
      });

      if (!credential) {
        throw new Error('Registration cancelled or failed');
      }

      setStatus('Saving fingerprint credential...');

      // Store the credential securely
      const savedCredential = await addCredential(username, credential, masterPassword);
      
      setStatus('Fingerprint registered successfully!');
      
      // Refresh credential list
      await loadExistingCredentials();
      
      if (onAuthSuccess) {
        onAuthSuccess({
          type: 'registration',
          credential: savedCredential
        });
      }

    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Registration cancelled or device not available';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Fingerprint/biometric authentication not supported';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error - please try again';
      }
      
      setStatus(errorMessage);
      
      if (onAuthError) {
        onAuthError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthentication = async () => {
    if (!isSupported || credentials.length === 0) {
      setStatus('No fingerprints available for authentication');
      return;
    }

    setIsLoading(true);
    setStatus('Preparing fingerprint authentication...');

    try {
      // Generate authentication options with user's credentials
      const options = generateAuthenticationOptions(credentials);
      
      setStatus('Touch your fingerprint sensor or use Windows Hello...');
      
      // Call WebAuthn API to get assertion
      const assertion = await navigator.credentials.get({
        publicKey: options
      });

      if (!assertion) {
        throw new Error('Authentication cancelled or failed');
      }

      setStatus('Verifying fingerprint...');

      // Find the credential that was used
      const usedCredentialId = arrayBufferToBase64(assertion.rawId);
      const usedCredential = credentials.find(cred => cred.credentialId === usedCredentialId);

      if (usedCredential) {
        // Update usage stats
        await updateCredentialUsage(
          usedCredentialId, 
          assertion.response.signature.counter || 0, 
          masterPassword
        );
      }

      setStatus('Fingerprint authentication successful!');
      
      if (onAuthSuccess) {
        onAuthSuccess({
          type: 'authentication',
          assertion,
          credential: usedCredential
        });
      }

    } catch (error) {
      console.error('Authentication error:', error);
      let errorMessage = 'Authentication failed';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Authentication cancelled or device not available';
      } else if (error.name === 'InvalidStateError') {
        errorMessage = 'No matching fingerprint found';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error - please try again';
      }
      
      setStatus(errorMessage);
      
      if (onAuthError) {
        onAuthError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="fingerprint-auth fingerprint-unsupported">
        <div className="fingerprint-icon">🚫</div>
        <p>Fingerprint authentication not supported on this device</p>
        <small>Requires Windows Hello, TouchID, or compatible biometric device</small>
      </div>
    );
  }

  return (
    <div className="fingerprint-auth">
      <div className="fingerprint-header">
        <div className="fingerprint-icon">👆</div>
        <h3>Fingerprint Authentication</h3>
      </div>

      <div className="fingerprint-status">
        <p>{status}</p>
      </div>

      <div className="fingerprint-buttons">
        {!hasCredentials && (
          <button 
            className="fingerprint-register-btn"
            onClick={handleRegistration}
            disabled={isLoading || !username || !masterPassword}
          >
            {isLoading ? 'Registering...' : '📝 Register Fingerprint'}
          </button>
        )}

        {hasCredentials && (
          <button 
            className="fingerprint-login-btn"
            onClick={handleAuthentication}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : '🔓 Unlock with Fingerprint'}
          </button>
        )}

        {hasCredentials && (
          <button 
            className="fingerprint-add-btn"
            onClick={handleRegistration}
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : '➕ Add Another Fingerprint'}
          </button>
        )}
      </div>

      {hasCredentials && (
        <div className="fingerprint-info">
          <small>
            {credentials.length} fingerprint{credentials.length !== 1 ? 's' : ''} registered
            {credentials.length > 0 && (
              <span> • Last used: {new Date(credentials[0].lastUsed).toLocaleDateString()}</span>
            )}
          </small>
        </div>
      )}

      <div className="fingerprint-help">
        <small>
          💡 Tip: Use Windows Hello, TouchID, or your device's built-in fingerprint sensor
        </small>
      </div>
    </div>
  );
};

export default FingerprintAuth;