process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const { seedFullProject } = require('./full.seed.js');

if (require.main === module) {
  seedFullProject().catch((err) => {
    console.error('Full seed failed with error:', err);
    process.exit(1);
  });
}

module.exports = { seedFullProject };
