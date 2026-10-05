import { afterEach, describe, expect, it, vi } from "vitest";
import { isTransactionalEmailConfigured } from "./email";

describe("transactional email configuration",()=>{
  afterEach(()=>vi.unstubAllEnvs());

  it("is disabled when provider variables are missing",()=>{
    vi.stubEnv("RESEND_API_KEY","");
    vi.stubEnv("EMAIL_FROM","");
    expect(isTransactionalEmailConfigured()).toBe(false);
  });

  it("is enabled only when key and sender are configured",()=>{
    vi.stubEnv("RESEND_API_KEY","re_test");
    vi.stubEnv("EMAIL_FROM","Seven Chat <no-reply@example.com>");
    expect(isTransactionalEmailConfigured()).toBe(true);
  });
});
