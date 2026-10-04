import { z } from "zod";

export const registerSchema = z.object({
  email: z.email().max(254).transform((v) => v.trim().toLowerCase()),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_.]+$/).transform((v) => v.toLowerCase()),
  displayName: z.string().min(2).max(60),
  password: z.string().min(10).max(128),
  birthDate: z.coerce.date()
}).superRefine((data, ctx) => {
  const now = new Date();
  let age = now.getUTCFullYear() - data.birthDate.getUTCFullYear();
  const birthday = new Date(Date.UTC(now.getUTCFullYear(), data.birthDate.getUTCMonth(), data.birthDate.getUTCDate()));
  if (now < birthday) age -= 1;
  if (age < 13 || age > 99) ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Idade deve estar entre 13 e 99 anos." });
});
export const loginSchema = z.object({ identifier: z.string().min(3).max(254), password: z.string().min(1).max(128) });
export const postSchema = z.object({ body: z.string().trim().min(1).max(4000), visibility: z.enum(["public","followers","private"]).default("public") });
export const messageSchema = z.object({
  body: z.string().trim().max(8000).optional(),
  type: z.enum(["text","image","video","audio","file"]).default("text"),
  mediaUrl: z.url().optional(),
  viewOnce: z.coerce.boolean().default(false)
}).refine((v) => Boolean(v.body || v.mediaUrl), { message: "Mensagem vazia." });
export const reportSchema = z.object({
  targetType: z.enum(["user","post","comment","message","live","room"]),
  targetId: z.uuid(),
  reason: z.enum(["spam","harassment","hate","sexual","violence","fraud","impersonation","other"]),
  details: z.string().max(2000).optional()
});
export const oauthRegisterSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_.]+$/).transform((v) => v.toLowerCase()),
  displayName: z.string().min(2).max(60),
  birthDate: z.coerce.date()
}).superRefine((data, ctx) => {
  const now = new Date();
  let age = now.getUTCFullYear() - data.birthDate.getUTCFullYear();
  const birthday = new Date(Date.UTC(now.getUTCFullYear(), data.birthDate.getUTCMonth(), data.birthDate.getUTCDate()));
  if (now < birthday) age -= 1;
  if (age < 13 || age > 99) ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Idade deve estar entre 13 e 99 anos." });
});
