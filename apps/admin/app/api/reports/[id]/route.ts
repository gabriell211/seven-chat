import {NextResponse} from "next/server";import {cookies} from "next/headers";
const API=process.env.SEVEN_API_URL??"https://seven-chat-gwt1.vercel.app";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  const token=(await cookies()).get("seven_admin_token")?.value;if(!token)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
  const {id}=await params,body=await req.text();
  const response=await fetch(API+"/api/v1/admin/reports/"+id,{method:"PATCH",headers:{authorization:"Bearer "+token,"content-type":"application/json"},body});
  return new NextResponse(await response.text(),{status:response.status,headers:{"content-type":"application/json"}});
}