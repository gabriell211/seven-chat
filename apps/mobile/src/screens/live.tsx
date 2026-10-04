import React,{useState} from "react";
import {FlatList,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {api} from "../api";
import {theme} from "../theme";
import type {Lives,Rooms} from "../types";

export function LiveScreen(){
  const [mode,setMode]=useState<"lives"|"rooms">("lives"),[title,setTitle]=useState(""),qc=useQueryClient();
  const lives=useQuery({queryKey:["lives"],queryFn:()=>api<Lives>("/api/v1/lives")});
  const rooms=useQuery({queryKey:["rooms"],queryFn:()=>api<Rooms>("/api/v1/rooms")});
  const createLive=useMutation({mutationFn:()=>api("/api/v1/lives",{method:"POST",body:JSON.stringify({title})}),onSuccess:async()=>{setTitle("");await qc.invalidateQueries({queryKey:["lives"]});}});
  const createRoom=useMutation({mutationFn:()=>api("/api/v1/rooms",{method:"POST",body:JSON.stringify({title,description:"",visibility:"public",vipOnly:false})}),onSuccess:async()=>{setTitle("");await qc.invalidateQueries({queryKey:["rooms"]});}});
  const data=mode==="lives"?lives.data?.data??[]:rooms.data?.data??[];
  return <View style={s.screen}><View style={s.switch}><Pressable onPress={()=>setMode("lives")} style={[s.chip,mode==="lives"&&s.active]}><Text style={s.text}>Lives</Text></Pressable><Pressable onPress={()=>setMode("rooms")} style={[s.chip,mode==="rooms"&&s.active]}><Text style={s.text}>Salas</Text></Pressable></View><View style={s.create}><TextInput value={title} onChangeText={setTitle} placeholder={mode==="lives"?"Título da live":"Nome da sala"} placeholderTextColor={theme.muted} style={s.input}/><Pressable disabled={title.trim().length<3} onPress={()=>mode==="lives"?createLive.mutate():createRoom.mutate()} style={s.button}><Text style={s.buttonText}>Criar</Text></Pressable></View><FlatList data={data as Array<{id:string;title:string}>} keyExtractor={x=>x.id} contentContainerStyle={s.list} ListEmptyComponent={<Text style={s.muted}>Nada ao vivo agora.</Text>} renderItem={({item})=><View style={s.card}><Text style={s.name}>{item.title}</Text><Text style={s.muted}>{mode==="lives"?"Ao vivo":"Sala de voz"}</Text></View>}/></View>;
}
const s=StyleSheet.create({screen:{flex:1,padding:14},switch:{flexDirection:"row",gap:8},chip:{paddingVertical:9,paddingHorizontal:14,borderRadius:999,backgroundColor:theme.panel},active:{backgroundColor:theme.brand},text:{color:theme.text,fontWeight:"800"},create:{flexDirection:"row",gap:8,marginVertical:12},input:{flex:1,backgroundColor:"#0d0b13",borderColor:theme.border,borderWidth:1,borderRadius:13,padding:11,color:theme.text},button:{backgroundColor:theme.brand,borderRadius:12,paddingHorizontal:16,justifyContent:"center"},buttonText:{color:"white",fontWeight:"900"},list:{gap:10,paddingBottom:100},card:{backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:16,padding:15},name:{color:theme.text,fontWeight:"900",fontSize:16},muted:{color:theme.muted,marginTop:5}});
