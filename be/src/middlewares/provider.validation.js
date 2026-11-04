import { AppError } from "../shared/app-error.js";
import { isObjectId } from "../shared/validators.js";

export const INCOMING_SORTS = Object.freeze({
  newest: { createdAt: -1 },
  soonest: { preferredStartAt: 1, createdAt: -1 },
});

const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 50;

const toPositiveInt = (value, fallback) => {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};

/**
 * Validates & normalises `GET /provider/requests/incoming` query params into `req.incomingQuery`.
 * (Express 5 makes `req.query` read-only, hence a separate property.)
 *
 *   page      >= 1                       (default 1)
 *   limit     1..50                      (default 9)
 *   category  ObjectId of one of the provider's skills (optional)
 *   sort      newest | soonest           (default newest)
 *   area      mine | all                 (default mine — filter by provider.serviceAreas)
 */
export function validateIncomingQuery(req, _res, next) {
  const { page, limit, category, sort = "newest", area = "mine" } = req.query;
  const errors = [];

  const pageNum = toPositiveInt(page, 1);
  const limitNum = toPositiveInt(limit, DEFAULT_LIMIT);

  if (Number.isNaN(pageNum)) errors.push({ field: "page", message: "page must be a positive integer" });
  if (Number.isNaN(limitNum) || limitNum > MAX_LIMIT) {
    errors.push({ field: "limit", message: `limit must be an integer between 1 and ${MAX_LIMIT}` });
  }
  if (category !== undefined && !isObjectId(category)) {
    errors.push({ field: "category", message: "category must be a valid id" });
  }
  if (!Object.hasOwn(INCOMING_SORTS, sort)) {
    errors.push({ field: "sort", message: `sort must be one of: ${Object.keys(INCOMING_SORTS).join(", ")}` });
  }
  if (!["mine", "all"].includes(area)) errors.push({ field: "area", message: "area must be 'mine' or 'all'" });

  if (errors.length) throw new AppError(400, "Invalid query parameters", errors);

  req.incomingQuery = { page: pageNum, limit: limitNum, category, sort, area };
  next();
}
