import { describe, expect, it } from "vitest";
import { decodeApiBody, getApiErrorMessage } from "../../apps/mobile/src/api-response";

describe("mobile API response parsing", () => {
  it("accepts empty responses without a JSON parse failure", () => {
    expect(decodeApiBody("")).toBeUndefined();
    expect(decodeApiBody("   ")).toBeUndefined();
  });

  it("parses valid JSON", () => {
    expect(decodeApiBody<{data:{ok:boolean}}>('{"data":{"ok":true}}')).toEqual({data:{ok:true}});
  });

  it("uses the API error message when present", () => {
    expect(getApiErrorMessage(422,{error:{message:"Senha inválida."}})).toBe("Senha inválida.");
  });

  it("uses a safe fallback for empty error responses", () => {
    expect(getApiErrorMessage(500,undefined)).toBe("Falha na API (500).");
  });

  it("converts malformed JSON into a safe application error", () => {
    expect(()=>decodeApiBody("{")).toThrow("O servidor retornou uma resposta inválida.");
  });
});
