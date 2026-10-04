import { Resend } from "resend";

function client(){
  const key=process.env.RESEND_API_KEY;
  const from=process.env.EMAIL_FROM;
  if(!key||!from)throw new Error("EMAIL_NOT_CONFIGURED");
  return {resend:new Resend(key),from};
}
export async function sendTransactionalEmail(input:{to:string;subject:string;text:string}){
  const {resend,from}=client();
  const {error}=await resend.emails.send({from,to:input.to,subject:input.subject,text:input.text},{signal:AbortSignal.timeout(10_000)});
  if(error)throw new Error("EMAIL_SEND_FAILED");
}