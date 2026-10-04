import { describe,expect,it } from "vitest";
import { isAllowedRegistrationEmail } from "./email-policy";
describe("registration email policy",()=>{
  it("allows normal domains",()=>expect(isAllowedRegistrationEmail("person@gmail.com")).toBe(true));
  it("rejects disposable domains",()=>expect(isAllowedRegistrationEmail("person@mailinator.com")).toBe(false));
  it("rejects malformed addresses",()=>expect(isAllowedRegistrationEmail("invalid")).toBe(false));
});