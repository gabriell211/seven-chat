import { NextResponse } from "next/server";
import { AdRewardError, fulfillAdReward, verifyAdmobCallback } from "@/services/admob";
import { publishRealtimeBestEffort } from "@/lib/realtime";

export async function GET(req:Request){
  try{
    const verified=await verifyAdmobCallback(req.url);
    const result=await fulfillAdReward(verified);
    if(!result.duplicate){
      await publishRealtimeBestEffort({
        channel:"user:"+verified.userId,event:"wallet.rewarded",
        data:{source:"admob",diamonds:verified.rewardDiamonds,transactionId:verified.transactionId}
      });
    }
    return new NextResponse("OK",{status:200});
  }catch(error){
    if(error instanceof AdRewardError)return new NextResponse(error.code,{status:400});
    return new NextResponse("REWARD_FAILED",{status:500});
  }
}