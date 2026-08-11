import { z } from "zod";
import { parsePositiveAmount } from "./money";

const positiveAmount = z
  .union([z.string(), z.number()])
  .transform((val, ctx) => {
    const parsed = parsePositiveAmount(val);
    if (!parsed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must be a valid positive number (max 2 decimal places)",
      });
      return z.NEVER;
    }
    return parsed;
  });

export const createPaymentSchema = z.object({
  customer_name: z.string().trim().min(1, "Customer/member name is required"),
  amount: positiveAmount,
  description: z
    .string()
    .trim()
    .min(1, "Item/service purchased is required"),
  notes: z.string().trim().optional().nullable(),
  payment_date: z.string().optional().nullable(),
  member_id: z.number().int().positive().optional().nullable(),
});

export const createMembershipPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required"),
  type: z.string().trim().min(1, "Plan type is required"),
  duration_days: z.coerce
    .number({ invalid_type_error: "Number of days must be a number" })
    .int("Number of days must be a whole number")
    .positive("Number of days must be greater than 0"),
  amount: positiveAmount,
});

/** Membership tab registers a user/member (not a plan catalog entry). */
export const registerMemberSchema = z
  .object({
    user_name: z.string().trim().optional(),
    full_name: z.string().trim().optional(),
    plan_type: z.string().trim().min(1, "Plan type is required"),
    duration_days: z.coerce
      .number({ invalid_type_error: "Number of days must be a number" })
      .int("Number of days must be a whole number")
      .positive("Number of days must be greater than 0"),
    amount: positiveAmount,
    contact_number: z.string().trim().optional().nullable(),
    registration_date: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const name = (data.user_name || data.full_name || "").trim();
    if (!name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "User name is required",
        path: ["user_name"],
      });
    }
  })
  .transform((data) => ({
    full_name: (data.user_name || data.full_name || "").trim(),
    plan_type: data.plan_type.trim(),
    duration_days: data.duration_days,
    amount: data.amount,
    contact_number: data.contact_number?.trim() || "-",
    registration_date: data.registration_date ?? null,
  }));
