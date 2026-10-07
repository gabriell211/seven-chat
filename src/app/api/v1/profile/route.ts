import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";

const schema=z.object({
  displayName:z.string().trim().min(2).max(60).optional(),
  bio:z.string().trim().max(500).optional(),
  region:z.string().trim().max(80).nullable().optional(),
  languages:z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  interests:z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  isPrivate:z.boolean().optional()
});

export async function PATCH(req:Request){
  try{
    const session=await requireRequestSession(req);
    const parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Dados do perfil inválidos."}},{status:422});
    const values={...parsed.data,updatedAt:new Date()};
    const [updated]=await db.update(profiles).set(values).where(eq(profiles.userId,session.userId)).returning({
      displayName:profiles.displayName,bio:profiles.bio,region:profiles.region,
      languages:profiles.languages,interests:profiles.interests,isPrivate:profiles.isPrivate
    });
    if(!updated)return NextResponse.json({error:{code:"PROFILE_NOT_FOUND",message:"Perfil não encontrado."}},{status:404});
    return NextResponse.json({data:updated});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
