import { Router } from "express";
import { protect, authorize } from "../../middlewares/auth.middleware.js";
import { isApprovedProvider } from "../../middlewares/provider.middleware.js";
import { validateIncomingQuery } from "../../middlewares/provider.validation.js";
import { getIncomingRequests } from "./provider.request.controller.js";

const router = Router();

router.use(protect, authorize("PROVIDER"));

// UC-35 View Incoming Requests
router.get("/requests/incoming", isApprovedProvider, validateIncomingQuery, getIncomingRequests);

export default router;
