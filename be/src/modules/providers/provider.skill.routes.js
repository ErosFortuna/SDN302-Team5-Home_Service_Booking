import { Router } from "express";
import { verifyProvider } from "../../middlewares/auth.middleware.js";
import { validateSkillsPayload } from "../../middlewares/category.validation.js";
import { getMySkills, updateMySkills } from "./provider.skill.controller.js";

/**
 * Mounted at /api/provider/skills — UC-33 Manage Skills.
 * Uses `verifyProvider` (not `isApprovedProvider`): new providers must be able to
 * declare skills while their profile is still PENDING verification.
 */
const router = Router();

router.use(verifyProvider);

router.get("/", getMySkills);
router.put("/", validateSkillsPayload, updateMySkills);

export default router;
