const mongoose = require("mongoose");
const { AppError } = require("../../shared/app-error.js");
const { isOwnedProviderDocument, ALLOWED_DOC_TYPES } = require("../../shared/validators.js");

const VALID_STATUSES = [
  "ALL",
  "PENDING",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
];

/**
 * Validate query params cho danh sách duyệt thợ (Admin / Staff)
 */
function validateListProvidersQuery(req, res, next) {
  try {
    const { status, search, page, limit } = req.query;

    const validated = {
      status: "ALL",
      search: "",
      page: 1,
      limit: 10,
    };

    if (search !== undefined) {
      if (typeof search !== "string" || search.length > 100) {
        throw new AppError(400, 'Từ khóa tìm kiếm tối đa 100 ký tự');
      }
      validated.search = search.trim();
    }

    if (status) {
      const rawStatus = String(status).toUpperCase();
      // Tương thích ngược tại lớp validate query: map APPROVED -> VERIFIED
      const normalizedStatus =
        rawStatus === "APPROVED" ? "VERIFIED" : rawStatus;
      if (!VALID_STATUSES.includes(normalizedStatus)) {
        throw new AppError(
          400,
          `Trạng thái lọc không hợp lệ. Cho phép: ${VALID_STATUSES.join(", ")}`,
        );
      }
      validated.status = normalizedStatus;
    }

    if (page !== undefined) {
      const p = parseInt(page, 10);
      if (isNaN(p) || p < 1) {
        throw new AppError(400, 'Tham số "page" phải là số nguyên dương >= 1');
      }
      validated.page = p;
    }

    if (limit !== undefined) {
      const l = parseInt(limit, 10);
      if (isNaN(l) || l < 1 || l > 100) {
        throw new AppError(
          400,
          'Tham số "limit" phải là số nguyên từ 1 đến 100',
        );
      }
      validated.limit = l;
    }

    req.validatedQuery = validated;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate MongoDB ObjectId trong params
 */
function validateProviderIdParam(req, res, next) {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(
      new AppError(400, "ID hồ sơ thợ không đúng định dạng ObjectId"),
    );
  }
  next();
}

/**
 * Validate body khi Admin từ chối hồ sơ (bắt buộc có lý do từ chối)
 */
function validateRejectPayload(req, res, next) {
  try {
    const { adminReviewNote, reason } = req.body || {};
    const note = (adminReviewNote || reason || "").trim();

    if (!note || note.length < 5) {
      throw new AppError(
        422,
        "Khi từ chối hồ sơ, bắt buộc phải nhập lý do từ chối (adminReviewNote tối thiểu 5 ký tự)",
      );
    }

    if (note.length > 1000) {
      throw new AppError(422, "Lý do từ chối không được vượt quá 1000 ký tự");
    }

    req.validatedNote = note;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate body khi Admin yêu cầu bổ sung thông tin (bắt buộc nêu rõ cần bổ sung gì)
 */
function validateRequestInfoPayload(req, res, next) {
  try {
    const { adminReviewNote, note } = req.body || {};
    const content = (adminReviewNote || note || "").trim();

    if (!content || content.length < 5) {
      throw new AppError(
        422,
        "Khi yêu cầu bổ sung thông tin, bắt buộc phải nêu rõ nội dung hoặc giấy tờ cần bổ sung (tối thiểu 5 ký tự)",
      );
    }

    if (content.length > 1000) {
      throw new AppError(
        422,
        "Nội dung ghi chú không được vượt quá 1000 ký tự",
      );
    }

    req.validatedNote = content;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate body khi Admin duyệt hồ sơ (ghi chú tùy chọn)
 */
function validateApprovePayload(req, res, next) {
  try {
    const { adminReviewNote, note } = req.body || {};
    const content = (adminReviewNote || note || "").trim();

    if (content.length > 1000) {
      throw new AppError(422, "Ghi chú duyệt không được vượt quá 1000 ký tự");
    }

    req.validatedNote = content || "Hồ sơ hợp lệ, đã phê duyệt tài khoản thợ.";
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate body khi Provider gửi lại hồ sơ bổ sung (UC-31)
 */
function validateResubmitPayload(req, res, next) {
  try {
    const { businessName, description, bio, serviceAreas, documents, note } =
      req.body || {};

    const clean = {};

    if (businessName !== undefined) {
      clean.businessName = String(businessName).trim().slice(0, 160);
    }

    if (description !== undefined || bio !== undefined) {
      clean.description = String(description || bio)
        .trim()
        .slice(0, 2000);
      clean.bio = clean.description;
    }

    if (serviceAreas !== undefined) {
      if (!Array.isArray(serviceAreas)) {
        throw new AppError(400, "serviceAreas phải là mảng danh sách khu vực");
      }
      clean.serviceAreas = serviceAreas.map((a) =>
        String(a).trim().slice(0, 100),
      );
    }

    if (documents !== undefined) {
      if (!Array.isArray(documents)) {
        throw new AppError(400, "documents phải là danh sách tài liệu");
      }
      if (documents.length > 10) {
        throw new AppError(400, "documents không được vượt quá 10 tài liệu");
      }

      const userId = req.user?._id || req.user?.id || req.user?.sub;
      if (!userId) {
        throw new AppError(401, "Yêu cầu đăng nhập");
      }

      clean.documents = documents.map((doc, idx) => {
        let docType = "OTHER";
        let fileUrl = "";
        let uploadedAt = new Date();

        if (typeof doc === "string") {
          fileUrl = doc.trim();
        } else if (typeof doc === "object" && doc !== null) {
          if (!doc.fileUrl || typeof doc.fileUrl !== "string") {
            throw new AppError(
              400,
              `Tài liệu thứ ${idx + 1} không hợp lệ (cần trường fileUrl)`,
            );
          }
          fileUrl = doc.fileUrl.trim();
          if (doc.docType !== undefined) {
            if (!ALLOWED_DOC_TYPES.includes(doc.docType)) {
              throw new AppError(
                400,
                `docType của tài liệu thứ ${idx + 1} không hợp lệ (cho phép: ${ALLOWED_DOC_TYPES.join(", ")})`,
              );
            }
            docType = doc.docType;
          }
          if (doc.uploadedAt) {
            const parsedDate = new Date(doc.uploadedAt);
            if (!isNaN(parsedDate.getTime())) {
              uploadedAt = parsedDate;
            }
          }
        } else {
          throw new AppError(
            400,
            `Tài liệu thứ ${idx + 1} không hợp lệ (cần trường fileUrl)`,
          );
        }

        if (!fileUrl) {
          throw new AppError(
            400,
            `Tài liệu thứ ${idx + 1} không hợp lệ (cần trường fileUrl)`,
          );
        }

        if (!isOwnedProviderDocument(fileUrl, userId)) {
          throw new AppError(
            400,
            `URL tài liệu thứ ${idx + 1} không hợp lệ hoặc không thuộc về người dùng này`,
          );
        }

        return {
          docType,
          fileUrl,
          uploadedAt,
        };
      });
    }

    clean.note =
      typeof note === "string"
        ? note.trim().slice(0, 1000)
        : "Provider đã cập nhật lại hồ sơ bổ sung";

    req.validatedResubmit = clean;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  VALID_STATUSES,
  ALLOWED_DOC_TYPES,
  validateListProvidersQuery,
  validateProviderIdParam,
  validateRejectPayload,
  validateRequestInfoPayload,
  validateApprovePayload,
  validateResubmitPayload,
};
