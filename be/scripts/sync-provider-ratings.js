/**
 * scripts/sync-provider-ratings.js
 *
 * Recalculates averageRating and reviewCount for all providers based on
 * active visible reviews in the Review collection.
 *
 * Safe by default:
 *   node scripts/sync-provider-ratings.js          # Dry-run (calculates ratings without writing to DB)
 *   node scripts/sync-provider-ratings.js --apply  # Applies updated ratings to ProviderProfile collection
 */

const { connectDB, disconnectDB } = require('../src/config/db.js');
const Review = require('../src/modules/reviews/review.model.js');
const ProviderProfile = require('../src/modules/providers/provider.model.js');

async function syncProviderRatings(options = {}) {
  const isApply = options.isApply !== undefined ? options.isApply : process.argv.includes('--apply');

  console.log('\n======================================================');
  console.log('  Provider Ratings Recalculation & Synchronization');
  console.log(`  Mode: ${isApply ? 'APPLY (Mutating DB)' : 'DRY-RUN (Safe preview)'}`);
  console.log('======================================================\n');

  await connectDB();

  // 1. Group all visible reviews by provider and calculate averages
  const aggregates = await Review.aggregate([
    { $match: { isVisible: true } },
    {
      $group: {
        _id: '$provider',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  console.log(`Found ${aggregates.length} provider(s) with visible reviews.`);

  let updatedCount = 0;
  for (const agg of aggregates) {
    const providerId = agg._id;
    const avg = agg.averageRating ? Math.round(agg.averageRating * 10) / 10 : 0;
    const count = agg.reviewCount || 0;

    console.log(`  - Provider [${providerId}]: averageRating=${avg}, reviewCount=${count}`);

    if (isApply) {
      await ProviderProfile.findOneAndUpdate(
        { user: providerId },
        {
          $set: {
            averageRating: agg.averageRating ?? 0,
            reviewCount: count,
          },
          $setOnInsert: { user: providerId },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      updatedCount += 1;
    }
  }

  // 2. Also check for provider profiles with 0 visible reviews to reset if stale
  const reviewedProviderIds = aggregates.map((a) => a._id);
  const profilesToReset = await ProviderProfile.find({
    user: { $nin: reviewedProviderIds },
    $or: [{ reviewCount: { $gt: 0 } }, { averageRating: { $gt: 0 } }],
  });

  if (profilesToReset.length > 0) {
    console.log(`\nFound ${profilesToReset.length} provider(s) with no reviews needing reset to 0:`);
    for (const p of profilesToReset) {
      console.log(`  - Resetting Provider [${p.user}]: averageRating=0, reviewCount=0`);
      if (isApply) {
        p.averageRating = 0;
        p.reviewCount = 0;
        await p.save();
        updatedCount += 1;
      }
    }
  }

  if (isApply) {
    console.log(`\n-> Successfully synchronized ratings for ${updatedCount} provider profiles.`);
  } else {
    console.log(`\n-> [DRY-RUN] No database modifications made. Pass --apply to update profiles.`);
  }

  await disconnectDB();
  console.log('Finished provider ratings synchronization.\n');
}

if (require.main === module) {
  syncProviderRatings().catch((err) => {
    console.error('Fatal error during sync-provider-ratings:', err);
    process.exit(1);
  });
}

module.exports = { syncProviderRatings };

