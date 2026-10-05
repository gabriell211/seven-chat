import { describe, expect, it } from "vitest";
import { messageSchema, registerSchema } from "./validation";

function validRegistration(overrides:Record<string,unknown>={}){
  const year=new Date().getUTCFullYear()-20;
  return {
    email:"a@b.com",
    username:"gabriel_7",
    displayName:"Gabriel",
    password:"1234567890",
    birthDate:year+"-01-01",
    ...overrides
  };
}

describe("registerSchema", () => {
  it("accepts valid age and a 10-character password", () => {
    expect(registerSchema.safeParse(validRegistration()).success).toBe(true);
  });
  it("rejects a 9-character password", () => {
    const parsed=registerSchema.safeParse(validRegistration({password:"123456789"}));
    expect(parsed.success).toBe(false);
    if(!parsed.success)expect(parsed.error.issues[0]?.path).toContain("password");
  });
  it("rejects under 13", () => {
    const year=new Date().getUTCFullYear()-10;
    expect(registerSchema.safeParse(validRegistration({birthDate:year+"-01-01"})).success).toBe(false);
  });
  it("rejects over 99", () => {
    const year=new Date().getUTCFullYear()-100;
    expect(registerSchema.safeParse(validRegistration({birthDate:year+"-01-01"})).success).toBe(false);
  });
});

describe("messageSchema",()=>{
  it("rejects empty messages",()=>expect(messageSchema.safeParse({type:"text",viewOnce:false}).success).toBe(false));
  it("rejects view-once text",()=>expect(messageSchema.safeParse({type:"text",body:"oi",viewOnce:true}).success).toBe(false));
  it("accepts view-once image asset",()=>expect(messageSchema.safeParse({type:"image",mediaAssetId:"550e8400-e29b-41d4-a716-446655440000",viewOnce:true}).success).toBe(true));
});
