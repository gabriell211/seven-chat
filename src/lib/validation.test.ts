import { describe, expect, it } from "vitest";
import { messageSchema, registerSchema } from "./validation";

describe("registerSchema", () => {
  it("accepts valid age", () => {
    const year = new Date().getUTCFullYear() - 20;
    expect(registerSchema.safeParse({ email:"a@b.com", username:"gabriel_7", displayName:"Gabriel", password:"1234567890x", birthDate: year + "-01-01" }).success).toBe(true);
  });
  it("rejects under 13", () => {
    const year = new Date().getUTCFullYear() - 10;
    expect(registerSchema.safeParse({ email:"a@b.com", username:"gabriel_7", displayName:"Gabriel", password:"1234567890x", birthDate: year + "-01-01" }).success).toBe(false);
  });
  it("rejects over 99", () => {
    const year = new Date().getUTCFullYear() - 100;
    expect(registerSchema.safeParse({ email:"a@b.com", username:"gabriel_7", displayName:"Gabriel", password:"1234567890x", birthDate: year + "-01-01" }).success).toBe(false);
  });
});

describe("messageSchema",()=>{
  it("rejects empty messages",()=>expect(messageSchema.safeParse({type:"text",viewOnce:false}).success).toBe(false));
  it("rejects view-once text",()=>expect(messageSchema.safeParse({type:"text",body:"oi",viewOnce:true}).success).toBe(false));
  it("accepts view-once image asset",()=>expect(messageSchema.safeParse({type:"image",mediaAssetId:"550e8400-e29b-41d4-a716-446655440000",viewOnce:true}).success).toBe(true));
});