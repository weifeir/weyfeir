import { Cloudinary as CloudinaryCore } from 'cloudinary-core';

// Your Cloudinary configuration
const cloudinaryConfig = {
  cloudName: 'dbqfvmnrc',  // Replace with your actual cloud name
  apiKey: '915646685641685',        // Replace with your actual API key
  apiSecret: 'xd0gReEz-pZDjkm5vjz9yKzzqgY',  // Replace with your actual API secret
  uploadPreset: 'zahid11'   // Create this unsigned upload preset in your Cloudinary dashboard
};

export const cloudinary = new CloudinaryCore({
  cloud: {
    cloudName: cloudinaryConfig.cloudName
  }
});

/**
 * Upload an image to Cloudinary
 * @param {File} file - The file to upload
 * @param {Function} progressCallback - Optional callback for upload progress
 * @returns {Promise<string>} - URL of the uploaded image
 */
export const uploadToCloudinary = async (file, progressCallback = () => {}) => {
  return new Promise((resolve, reject) => {
    const url = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`;
    
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    xhr.open('POST', url, true);
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded * 100) / e.total);
        progressCallback(progress);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.secure_url);
      } else {
        reject(new Error('Upload failed'));
      }
    };
    
    xhr.onerror = () => {
      reject(new Error('Upload failed'));
    };
    
    // Add file to form data
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('folder', 'chat_images');
    
    // Add timestamp and eager transformations if needed
    formData.append('timestamp', Date.now() / 1000);
    
    // Send the form data
    xhr.send(formData);
  });
};

export default cloudinaryConfig; 