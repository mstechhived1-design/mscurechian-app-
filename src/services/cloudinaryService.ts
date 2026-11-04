/**
 * Cloudinary Direct Upload Service for MSCureChain Patient App
 *
 * Uploads patient profile photos directly to Cloudinary global cloud CDN,
 * returning a secure HTTPS URL for persistent cross-device viewing.
 */

const CLOUDINARY_CLOUD_NAME = 'dnjxgcl3f';
const CLOUDINARY_API_KEY = '842839579248378';
const CLOUDINARY_API_SECRET = '0UJR6xxBLO1BOkGTQfozg4NgDzc';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const FOLDER_NAME = 'patient_profiles';

/**
 * Pure TypeScript SHA-1 implementation (Zero external native dependencies)
 */
function sha1(str: string): string {
  function rotateLeft(n: number, s: number) {
    return (n << s) | (n >>> (32 - s));
  }
  function cvt_hex(val: number) {
    let s = '';
    for (let i = 7; i >= 0; i--) {
      const v = (val >>> (i * 4)) & 0x0f;
      s += v.toString(16);
    }
    return s;
  }
  const nwords = ((str.length + 8) >> 6) + 1;
  const words = new Array(nwords * 16);
  for (let i = 0; i < nwords * 16; i++) words[i] = 0;
  for (let i = 0; i < str.length; i++) {
    words[i >> 2] |= str.charCodeAt(i) << (24 - (i % 4) * 8);
  }
  words[str.length >> 2] |= 0x80 << (24 - (str.length % 4) * 8);
  words[nwords * 16 - 1] = str.length * 8;

  let H0 = 0x67452301;
  let H1 = 0xefcdab89;
  let H2 = 0x98badcfe;
  let H3 = 0x10325476;
  let H4 = 0xc3d2e1f0;
  const W = new Array(80);

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) W[t] = words[i + t];
    for (let t = 16; t < 80; t++) {
      W[t] = rotateLeft(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
    }

    let A = H0;
    let B = H1;
    let C = H2;
    let D = H3;
    let E = H4;

    for (let t = 0; t < 80; t++) {
      let temp = 0;
      if (t < 20) temp = ((B & C) | (~B & D)) + 0x5a827999;
      else if (t < 40) temp = (B ^ C ^ D) + 0x6ed9eba1;
      else if (t < 60) temp = ((B & C) | (B & D) | (C & D)) + 0x8f1bbcdc;
      else temp = (B ^ C ^ D) + 0xca62c1d6;

      temp = (rotateLeft(A, 5) + temp + E + W[t]) & 0xffffffff;
      E = D;
      D = C;
      C = rotateLeft(B, 30);
      B = A;
      A = temp;
    }
    H0 = (H0 + A) & 0xffffffff;
    H1 = (H1 + B) & 0xffffffff;
    H2 = (H2 + C) & 0xffffffff;
    H3 = (H3 + D) & 0xffffffff;
    H4 = (H4 + E) & 0xffffffff;
  }
  return (cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4)).toLowerCase();
}

/**
 * Upload an image (Base64 string or file URI) directly to Cloudinary
 * @returns {Promise<string>} The permanent HTTPS secure_url of the uploaded image
 */
export async function uploadProfileImageToCloudinary(
  imageSource: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  // Signature parameters in alphabetical order: folder, timestamp
  const paramString = `folder=${FOLDER_NAME}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = sha1(paramString);

  const formData = new FormData();
  formData.append('file', imageSource);
  formData.append('api_key', CLOUDINARY_API_KEY);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', FOLDER_NAME);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.secure_url) {
    const errorMsg = data.error?.message || 'Failed to upload photo to Cloudinary';
    console.error('[Cloudinary] Upload failed:', errorMsg);
    throw new Error(errorMsg);
  }

  console.log('[Cloudinary] Upload success! Permanent URL:', data.secure_url);
  return data.secure_url as string;
}

