import { describe, expect, it } from "vitest";
import { registerSchema } from "./validation";

describe("registerSchema", () => {
  it("accepts valid age", () => {
    const year = new Date().getUTCFullYear() - 20;
    const result = registerSchema.safeParse({ email:"a@b.com", username:"gabriel_7", displayName:"Gabriel", password:"1234567890x", birthDate: year + "-01-01" });
    expect(result.success).toBe(true);
  });
  it("rejects under 13", () => {
    const year = new Date().getUTCFullYear() - 10;
    const result = registerSchema.safeParse({ email:"a@b.com", username:"gabriel_7", displayName:"Gabriel", password:"1234567890x", birthDate: year + "-01-01" });
    expect(result.success).toBe(false);
  });
});