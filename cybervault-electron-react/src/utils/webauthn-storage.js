import { v4 as uuidv4 } from 'uuid';
import { encryptNeuralKey, validateNeuralKey } from './encryption.js';

/**
 * WebAuthn Credential Storage Schema
 * Stored as encrypted JSON in app userData directory
 */
const CREDENTIAL_STORE_FILENAME = 'webauthn_credentials.json';

/**
 * Data structure for stored credentials:
 * {
 *   version: "1.0",
 *   credentials: [
 *     {
 *       id: "credential-uuid",
 *       userId: "user-uuid", 
 *       username: "quantum_user_001",
 *       credentialId: "base64-encoded-credential-id",
 *       publicKey: "base64-encoded-public-key", // optional for client-side verification
 *       counter: 0, // signature counter from authenticator
 *       createdAt: "2025-10-09T21:44:13.667Z",
 *       lastUsed: "2025-10-09T21:44:13.667Z",
 *       userVerification: "preferred", // or "required"
 *       transports: ["internal", "usb"] // available transport methods
 *     }
 *   ],
 *   relyingParty: {
 *     id: "cybervault.local",
 *     name: "CyberVault"
 *   }
 * }
 */

// Default relying party configuration
// For Electron apps, use localhost since it's a valid origin
const DEFAULT_RP = {
  id: 'localhost',
  name: 'CyberVault'
};

/**
 * Generate a secure challenge for WebAuthn operations
 */
export function generateChallenge() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return array;
}

/**
 * Convert ArrayBuffer to base64 string for storage
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string back to ArrayBuffer
 */
export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Load and decrypt credential store from disk
 * Returns empty store structure if file doesn't exist
 */
export async function loadCredentialStore(masterPassword) {
  try {
    // Check if electronAPI is available
    if (!window.electronAPI || !window.electronAPI.readCredentialStore) {
      console.warn('electronAPI not available, using localStorage fallback');
      // Use localStorage as fallback for development
      const stored = localStorage.getItem('webauthn_' + CREDENTIAL_STORE_FILENAME);
      if (!stored) {
        return {
          version: "1.0",
          credentials: [],
          relyingParty: DEFAULT_RP
        };
      }
      return JSON.parse(stored);
    }

    // Call main process via IPC to read encrypted file
    const encryptedData = await window.electronAPI.readCredentialStore(CREDENTIAL_STORE_FILENAME);
    
    if (!encryptedData) {
      // Return empty store if no file exists
      return {
        version: "1.0",
        credentials: [],
        relyingParty: DEFAULT_RP
      };
    }

    // For now, assume data is stored as JSON (encryption to be implemented later)
    if (typeof encryptedData === 'string') {
      return JSON.parse(encryptedData);
    }
    
    return encryptedData;
  } catch (error) {
    console.error('Error loading credential store:', error);
    throw new Error('Failed to load WebAuthn credentials');
  }
}

/**
 * Encrypt and save credential store to disk
 */
export async function saveCredentialStore(store, masterPassword) {
  try {
    const jsonData = JSON.stringify(store, null, 2);
    
    // Check if electronAPI is available
    if (!window.electronAPI || !window.electronAPI.writeCredentialStore) {
      console.warn('electronAPI not available, using localStorage fallback');
      // Use localStorage as fallback for development
      localStorage.setItem('webauthn_' + CREDENTIAL_STORE_FILENAME, jsonData);
      return true;
    }
    
    // For now, store as plain JSON (encryption can be added later)
    await window.electronAPI.writeCredentialStore(CREDENTIAL_STORE_FILENAME, jsonData);
    
    return true;
  } catch (error) {
    console.error('Error saving credential store:', error);
    throw new Error('Failed to save WebAuthn credentials');
  }
}

/**
 * Add a new credential to the store
 */
export async function addCredential(username, credentialData, masterPassword) {
  const store = await loadCredentialStore(masterPassword);
  
  const newCredential = {
    id: uuidv4(),
    userId: uuidv4(),
    username,
    credentialId: arrayBufferToBase64(credentialData.rawId),
    publicKey: arrayBufferToBase64(credentialData.response.attestationObject),
    counter: 0,
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    userVerification: 'preferred',
    transports: credentialData.response.getTransports ? credentialData.response.getTransports() : []
  };
  
  store.credentials.push(newCredential);
  await saveCredentialStore(store, masterPassword);
  
  return newCredential;
}

/**
 * Get all credentials for a user
 */
export async function getUserCredentials(username, masterPassword) {
  const store = await loadCredentialStore(masterPassword);
  return store.credentials.filter(cred => cred.username === username);
}

/**
 * Update credential last used timestamp and counter
 */
export async function updateCredentialUsage(credentialId, counter, masterPassword) {
  const store = await loadCredentialStore(masterPassword);
  const credential = store.credentials.find(cred => cred.credentialId === credentialId);
  
  if (credential) {
    credential.lastUsed = new Date().toISOString();
    credential.counter = Math.max(credential.counter, counter);
    await saveCredentialStore(store, masterPassword);
  }
}

/**
 * Get relying party configuration
 */
export function getRelyingParty() {
  return DEFAULT_RP;
}

/**
 * Generate WebAuthn registration options
 */
export function generateRegistrationOptions(username, userId = null) {
  const challenge = generateChallenge();
  const user = {
    id: new TextEncoder().encode(userId || uuidv4()),
    name: username,
    displayName: username
  };
  
  return {
    challenge,
    rp: DEFAULT_RP,
    user,
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }, // ES256
      { alg: -257, type: "public-key" } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // Prefer built-in authenticators (Windows Hello, TouchID)
      userVerification: "preferred",
      requireResidentKey: false
    },
    timeout: 60000,
    attestation: "direct"
  };
}

/**
 * Generate WebAuthn authentication options
 */
export function generateAuthenticationOptions(allowedCredentials = []) {
  const challenge = generateChallenge();
  
  return {
    challenge,
    rpId: DEFAULT_RP.id,
    allowCredentials: allowedCredentials.map(cred => ({
      id: base64ToArrayBuffer(cred.credentialId),
      type: "public-key",
      transports: cred.transports
    })),
    userVerification: "preferred",
    timeout: 60000
  };
}