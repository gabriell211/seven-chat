import React,{useState} from "react";
import {FlatList,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import {api} from "../api";
import {uploadMedia} from "../media";
import {theme} from "../theme";
import type {Conversations,Messages} from "../types";

export function ChatScreen({myId}:{myId:string}){
  const [selected,setSelected]=useState<string|null>(null),[body,setBody]=useState(""),[asset,setAsset]=useState<ImagePicker.ImagePickerAsset|null>(null),[viewOnce,setViewOnce]=useState(false),qc=useQueryClient();
  const conversations=useQuery({queryKey:["conversations"],queryFn:()=>api<Conversations>("/api/v1/chat/conversations")});
  const messages=useQuery({queryKey:["messages",selected],queryFn:()=>api<Messages>("/api/v1/chat/conversations/"+selected+"/messages"),enabled:Boolean(selected)});
  const send=useMutation({
    mutationFn:async()=>{
      let mediaAssetId:string|undefined;
      if(asset)mediaAssetId=(await uploadMedia(asset,"chat")).assetId;
      return api("/api/v1/chat/conversations/"+selected+"/messages",{method:"POST",body:JSON.stringify({
        type:asset?(asset.type==="video"?"video":"image"):"text",body:body.trim()||undefined,mediaAssetId,viewOnce:asset?viewOnce:false
      })});
    },
    onSuccess:async()=>{setBody("");setAsset(null);setViewOnce(false);await qc.invalidateQueries({queryKey:["messages",selected]});}
  });
  const choose=async()=>{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images","videos"],quality:.9,allowsMultipleSelection:false});if(!result.canceled)setAsset(result.assets[0]);};
  if(!selected)return <FlatList data={conversations.data?.data??[]} refreshing={conversations.isFetching} onRefresh={()=>conversations.refetch()} keyExtractor={x=>x.id} contentContainerStyle={s.list} ListEmptyComponent={<View style={s.empty}><Text style={s.muted}>Nenhuma conversa ainda.</Text></View>} renderItem={({item})=><Pressable onPress={()=>setSelected(item.id)} style={s.row}><View style={s.avatar}><Text style={s.avatarText}>{(item.title??"C")[0]}</Text></View><View><Text style={s.name}>{item.title??(item.type==="direct"?"Conversa direta":"Grupo")}</Text><Text style={s.muted}>{item.type==="group"?"Grupo":"Mensagem privada"}</Text></View></Pressable>}/>;
  const ordered=[...(messages.data?.data??[])].reverse();
  return <View style={s.chat}><Pressable onPress={()=>{setSelected(null);setAsset(null);setViewOnce(false)}} style={s.back}><Text style={s.link}>‹ Conversas</Text></Pressable>
    <FlatList data={ordered} keyExtractor={x=>x.id} contentContainerStyle={s.messages} renderItem={({item})=><View style={[s.bubble,item.senderId===myId?s.mine:null]}><Text style={s.body}>{item.body??(item.mediaAssetId?(item.viewOnce?"📷 Mídia 1×":"📎 Mídia"):"["+item.type+"]")}</Text>{item.viewOnce?<Text style={s.small}>{item.openedAt?"aberta":"visualização única"}</Text>:null}</View>}/>
    {asset?<View style={s.attachment}><Text style={s.body}>{asset.type==="video"?"🎬 Vídeo":"🖼️ Foto"}</Text><Pressable onPress={()=>setViewOnce(v=>!v)} style={[s.once,viewOnce&&s.onceActive]}><Text style={s.onceText}>1× {viewOnce?"ativo":""}</Text></Pressable><Pressable onPress={()=>{setAsset(null);setViewOnce(false)}}><Text style={s.remove}>Remover</Text></Pressable></View>:null}
    {send.error?<Text style={s.error}>{send.error.message}</Text>:null}
    <View style={s.send}><Pressable onPress={choose} style={s.attach}><Text style={s.attachText}>＋</Text></Pressable><TextInput value={body} onChangeText={setBody} placeholder="Mensagem..." placeholderTextColor={theme.muted} style={s.input}/><Pressable disabled={(!body.trim()&&!asset)||send.isPending} onPress={()=>send.mutate()} style={s.button}><Text style={s.buttonText}>{send.isPending?"…":"Enviar"}</Text></Pressable></View></View>;
}
const s=StyleSheet.create({list:{padding:14,gap:9,paddingBottom:100},row:{flexDirection:"row",alignItems:"center",gap:11,backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:16,padding:13},avatar:{width:44,height:44,borderRadius:22,backgroundColor:theme.brand,alignItems:"center",justifyContent:"center"},avatarText:{color:"white",fontWeight:"900"},name:{color:theme.text,fontWeight:"900"},muted:{color:theme.muted},empty:{padding:30,alignItems:"center"},chat:{flex:1},back:{padding:14},link:{color:theme.brand,fontWeight:"900"},messages:{padding:14,gap:7,paddingBottom:140},bubble:{maxWidth:"82%",alignSelf:"flex-start",backgroundColor:theme.panel,borderRadius:16,padding:11},mine:{alignSelf:"flex-end",backgroundColor:"#5b21b6"},body:{color:theme.text},small:{color:"#ddd",fontSize:10,marginTop:4},attachment:{position:"absolute",bottom:58,left:8,right:8,backgroundColor:theme.panel2,borderRadius:12,padding:9,flexDirection:"row",alignItems:"center",gap:10},once:{padding:7,borderRadius:10,borderWidth:1,borderColor:theme.border},onceActive:{backgroundColor:theme.brand},onceText:{color:theme.text,fontWeight:"800"},remove:{color:"#fca5a5"},error:{position:"absolute",bottom:112,left:14,color:"#fca5a5"},send:{position:"absolute",bottom:0,left:0,right:0,flexDirection:"row",gap:8,padding:10,backgroundColor:theme.bg,borderTopColor:theme.border,borderTopWidth:1},attach:{width:42,height:42,borderRadius:12,backgroundColor:theme.panel2,alignItems:"center",justifyContent:"center"},attachText:{color:theme.text,fontSize:24},input:{flex:1,backgroundColor:"#0d0b13",borderColor:theme.border,borderWidth:1,borderRadius:13,padding:11,color:theme.text},button:{backgroundColor:theme.brand,borderRadius:12,paddingHorizontal:15,justifyContent:"center"},buttonText:{color:"white",fontWeight:"900"}});
