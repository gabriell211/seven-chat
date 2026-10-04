import { isDisposableEmail } from "disposable-email-domains-js";

export function isAllowedRegistrationEmail(email:string):boolean{
  const normalized=email.trim().toLowerCase();
  if(!normalized.includes("@"))return false;
  return !isDisposableEmail(normalized);
}
