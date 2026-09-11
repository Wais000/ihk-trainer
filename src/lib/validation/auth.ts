import { z } from "zod";

export const emailSchema = z.string().trim().min(1, "E-Mail wird benötigt.").email("Ungültige E-Mail-Adresse.");
export const passwordSchema = z.string().min(8, "Das Passwort muss mindestens 8 Zeichen haben.");

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Name wird benötigt.").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Passwort wird benötigt."),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  password: passwordSchema,
});
