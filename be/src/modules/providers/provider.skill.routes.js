const { Router } = require('express');
const { protect, authorize } = require('../../middlewares/auth.middleware.js');
const { handleAppError } = require('../../shared/app-error.js');
const { validateSkillsPayload } = require('./provider.validation.js');
const { getMySkills, updateMySkills } = require('./provider.skill.controller.js');

/**
 * Mounted at /api/provider/skills — UC-33 Manage Skills.
 * Only `authorize('PROVIDER')` (not `isVerifiedProvider`): new providers must be able
 * to declare skills while their profile is still PENDING verification.
 */
const router = Router();

const verifyProvider = [protect, authorize('PROVIDER')];

router.get('/', verifyProvider, getMySkills);
router.put('/', verifyProvider, validateSkillsPayload, updateMySkills);

router.use(handleAppError);

module.exports = router;
