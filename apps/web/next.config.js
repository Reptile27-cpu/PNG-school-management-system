/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com', 'via.placeholder.com', 'png-sms.com'],
  },
  transpilePackages: ['@png-sms/shared'],
};

module.exports = nextConfig;

