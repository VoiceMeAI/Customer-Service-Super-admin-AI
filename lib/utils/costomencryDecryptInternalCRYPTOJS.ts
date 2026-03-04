import CryptoJS from "crypto-js";

/**
 * Generates a random 16-byte IV and returns it as Base64.
 */
const generateIV = (): string => {
  const iv = CryptoJS.lib.WordArray.random(16); // AES block size = 16 bytes
  return CryptoJS.enc.Base64.stringify(iv);
};

/**
 * Encrypt data using AES-256-CBC with PKCS7 padding.
 *
 * @param data - Plaintext string to encrypt
 * @param keyBase64 - Base64 encoded 32-byte (256-bit) key
 * @param ivBase64 - Optional Base64 IV (if not provided, a new one will be generated)
 * @returns Encrypted payload in the format "ciphertext;base64IV"
 */
const encrypt = async (data: string, keyBase64: string, ivBase64?: string) => {
  // Parse 32-byte AES key
  const key = CryptoJS.enc.Base64.parse(keyBase64);
  console.log(keyBase64);
  // Generate a new IV if not provided
  const ivString = ivBase64 || generateIV();
  const iv = CryptoJS.enc.Base64.parse(ivString);


  console.log({ ivBase64, ivString });
  // Encrypt using AES-256-CBC
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();

  // Return cipher text and IV (Base64) combined
  return `${encrypted};${ivString}`;
};

/**
 * Decrypt AES-256-CBC encrypted data.
 *
 * @param encryptedPayload - Encrypted data in format "ciphertext;base64IV"
 * @param keyBase64 - Base64 encoded 32-byte (256-bit) key
 * @returns Decrypted UTF-8 string
 */
const decrypt = async (encryptedPayload: string, keyBase64: string) => {
  const [cipherText, ivBase64] = encryptedPayload.split(";");
  console.log({ cipherText, ivBase64 });

  if (!cipherText || !ivBase64) {
    throw new Error("Invalid encrypted payload format. Expected 'cipherText;base64IV'");
  }

  try {
    const key = CryptoJS.enc.Base64.parse(keyBase64);
    const iv = CryptoJS.enc.Base64.parse(ivBase64);

    // Alternative approach if direct decryption doesn't work:
    // Create CipherParams object explicitly
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(cipherText),
    });
    console.log("CipherParams:", cipherParams);
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    console.log("Decrypted result:", decrypted);

    const result = decrypted.toString(CryptoJS.enc.Utf8);
    console.log("UTF-8 result:", result);

    return result;
  } catch (error: any) {
    console.error("Decryption error:", error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Unified encrypt/decrypt handler for AES-256-CBC.
 */
export const costomencryDecryptInternalCRYPTOJS = async (
  requestType: "EN" | "DE",
  data: string,
  keyBase64: string,
  ivBase64?: string
) => {
  try {
    console.log({ requestType, data, keyBase64, ivBase64 });
    if (requestType === "EN") {
      const encryptedData = await encrypt(data, keyBase64, ivBase64);
      console.log("encryption..................");
      return {
        status: true,
        payload: encryptedData,
      };
    } else {
      const decryptedData = await decrypt(data, keyBase64);
      console.log("decryption................", decryptedData);
      return {
        status: true,
        payload: JSON.parse(decryptedData),
      };
    }
  } catch (error: any) {
    console.error("❌ CryptoJS Error 111:", error.message);
    return {
      status: false,
      payload: "Error: " + error.message,
    };
  }
};

/**
 * Example key generation (32-byte AES key)
 */
export const generateAES256Key = (): string => {
  const key = CryptoJS.lib.WordArray.random(32); // 256-bit key
  return CryptoJS.enc.Base64.stringify(key);
};
