const cloudinary = require('cloudinary').v2;
const { env } = require('./env.js');

if (env.cloudinaryUrl) {
  cloudinary.config({
    cloudinary_url: env.cloudinaryUrl,
  });
} else if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
}

function isCloudinaryConfigured() {
  return Boolean(
    env.cloudinaryUrl ||
      (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret)
  );
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
};
