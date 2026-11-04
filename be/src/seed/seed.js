const { seedFullProject } = require('./full.seed.js');

if (require.main === module) {
  seedFullProject().catch((err) => {
    console.error('Full seed failed with error:', err);
    process.exit(1);
  });
}

module.exports = { seedFullProject };
