import { Router } from "express";
import * as authController from "../controllers/authController";
import * as dashboardController from "../controllers/dashboardController";
import * as memberController from "../controllers/memberController";
import * as membershipPlanController from "../controllers/membershipPlanController";
import * as paymentController from "../controllers/paymentController";
import * as reportController from "../controllers/reportController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";
import {
  createMembershipPlanSchema,
  createPaymentSchema,
  loginSchema,
  registerMemberSchema,
  renewMembersSchema,
} from "../utils/validators";

const router = Router();

router.post(
  "/auth/login",
  validateBody(loginSchema),
  asyncHandler(authController.login)
);
router.post("/auth/logout", asyncHandler(authController.logout));
router.get("/auth/me", asyncHandler(authController.me));

router.use(requireAuth);

router.get("/dashboard", asyncHandler(dashboardController.getDashboard));

router.get("/payments", asyncHandler(paymentController.getPayments));
router.get("/payments/today", asyncHandler(paymentController.getTodayPayments));
router.post(
  "/payments",
  validateBody(createPaymentSchema),
  asyncHandler(paymentController.createPayment)
);
router.post(
  "/payments/close-daily",
  asyncHandler(paymentController.closeDailySales)
);

router.get(
  "/membership-plans",
  asyncHandler(membershipPlanController.getMembershipPlans)
);
router.post(
  "/membership-plans",
  validateBody(createMembershipPlanSchema),
  asyncHandler(membershipPlanController.createMembershipPlan)
);

router.get("/members", asyncHandler(memberController.getMembers));
router.post(
  "/members",
  validateBody(registerMemberSchema),
  asyncHandler(memberController.createMember)
);
router.post(
  "/members/renew",
  validateBody(renewMembersSchema),
  asyncHandler(memberController.renewMembers)
);
router.delete(
  "/members/:id",
  asyncHandler(memberController.deleteMember)
);
router.delete(
  "/memberships/:id",
  asyncHandler(memberController.deleteMembership)
);

router.get("/reports", asyncHandler(reportController.getReports));
router.get("/reports/:id", asyncHandler(reportController.getReportById));

export default router;
