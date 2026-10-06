import { z } from "zod";
import { isValidIndianPhone, normalizeIndianPhone } from "../lib/phone";

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/\d/, "Add a number")
  .regex(/[!@#$%^&*(),.?\":{}|<>]/, "Add a special character");

const phoneField = z
  .string()
  .trim()
  .min(1, "Mobile number is required")
  .transform((val) => normalizeIndianPhone(val))
  .refine((val) => isValidIndianPhone(val), {
    message: "Enter a valid 10-digit mobile number (starts with 6-9)",
  });

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters"),
    email: z.string().trim().email("Enter a valid email address"),
    phone: phoneField,
    password,
    confirmPassword: z.string().min(1, "Confirm your password"),
    termsAccepted: z.boolean().refine((accepted) => accepted, {
      message: "You must accept the Terms & Conditions",
    }),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const verifyOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const emailLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),

  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine(
    ({ password: nextPassword, confirmPassword }) =>
      nextPassword === confirmPassword,
    {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    },
  );

export const updateProfileSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  phone: phoneField,
});
