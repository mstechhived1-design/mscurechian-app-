/**
 * MSCureChain Patient App — Secure Avatar Upload Service
 *
 * Uploads patient profile photos via the secure backend route:
 * POST /api/patient/profile/avatar
 *
 * The backend uses its own .env credentials to upload to Cloudinary,
 * keeping all Cloudinary secrets off the client device.
 */

import apiClient from '@/api/axiosConfig';

/**
 * Upload an image (Base64 string or file URI) via the secure MSCureChain Backend.
 * @param {string} imageSource - Base64 data string or image data URI
 * @returns {Promise<string>} The permanent HTTPS secure_url of the uploaded image
 */
export async function uploadProfileImageToCloudinary(
  imageSource: string
): Promise<string> {
  console.log('[AvatarUpload] Uploading avatar via secure backend route...');

  const response = await apiClient.post('/patient/profile/avatar', {
    image: imageSource,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 45000,
  });

  const avatarUrl = response.data?.avatar || response.data?.data?.avatar;

  if (!avatarUrl) {
    throw new Error(response.data?.message || 'Failed to upload photo via server');
  }

  console.log('[AvatarUpload] Upload success via backend! Permanent URL:', avatarUrl);
  return avatarUrl as string;
}
