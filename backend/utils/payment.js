// backend/utils/payment.js
const CryptoJS = require("crypto-js");

/**
 * Generates eSewa signature using HMAC-SHA256
 * @param {string} secretKey - eSewa Secret Key
 * @param {string} message - Message to sign (total_amount,transaction_uuid,product_code)
 * @returns {string} - Base64 encoded signature
 */
function generateEsewaSignature(secretKey, message) {
  const hash = CryptoJS.HmacSHA256(message, secretKey);
  return CryptoJS.enc.Base64.stringify(hash);
}

module.exports = {
  generateEsewaSignature,
};
