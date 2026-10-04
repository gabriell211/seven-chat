import React from "react";
import {FlatList,StyleSheet,Text,View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {api} from "../api";
import {theme} from "../theme";
import type {Reels} from "../types";
export function ReelsScreen(){
  const q=useQuery({queryKey:["reels"],queryFn:()=>api<Reels>("/api/v1/reels")});
  return <FlatList data={q.data?.data??[]} refreshing={q.isFetching} onRefresh={()=>q.refetch()} keyExtractor={x=>x.id} contentContainerStyle={s.list}
    ListEmptyComponent={<View style={s.empty}><Text style={s.muted}>Nenhum reel publicado ainda.</Text></View>}
    renderItem={({item})=><View style={s.reel}><View style={s.video}><Text style={s.play}>▶</Text><Text style={s.muted}>{Math.round(item.durationMs/1000)}s</Text></View><Text style={s.name}>{item.displayName} <Text style={s.muted}>@{item.username}</Text></Text><Text style={s.caption}>{item.caption}</Text><Text style={s.muted}>{item.viewCount} visualizações</Text></View>}/>;
}
const s=StyleSheet.create({list:{padding:14,gap:14,paddingBottom:100},reel:{backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:18,overflow:"hidden",paddingBottom:14},video:{height:340,backgroundColor:"#100b18",alignItems:"center",justifyContent:"center",gap:6},play:{fontSize:38,color:theme.brand},name:{color:theme.text,fontWeight:"900",paddingHorizontal:14,paddingTop:12},caption:{color:theme.text,paddingHorizontal:14,paddingVertical:8},muted:{color:theme.muted,paddingHorizontal:14},empty:{padding:30,alignItems:"center"}});
