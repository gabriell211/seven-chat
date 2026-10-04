import React,{useState} from "react";
import {FlatList,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import {api} from "../api";
import {uploadMedia} from "../media";
import {theme} from "../theme";
import type {Feed,Me} from "../types";

export function HomeScreen(){
  const qc=useQueryClient(),[body,setBody]=useState(""),[asset,setAsset]=useState<ImagePicker.ImagePickerAsset|null>(null);
  const me=useQuery({queryKey:["me"],queryFn:()=>api<Me>("/api/v1/auth/me")});
  const feed=useQuery({queryKey:["feed"],queryFn:()=>api<Feed>("/api/v1/feed")});
  const post=useMutation({
    mutationFn:async()=>{
      const mediaAssetIds:string[]=[];
      if(asset)mediaAssetIds.push((await uploadMedia(asset,"post")).assetId);
      return api("/api/v1/posts",{method:"POST",body:JSON.stringify({body,visibility:"public",commentsEnabled:true,mediaAssetIds})});
    },
    onSuccess:async()=>{setBody("");setAsset(null);await qc.invalidateQueries({queryKey:["feed"]});}
  });
  const choose=async()=>{
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:["images","videos"],quality:.9,allowsMultipleSelection:false});
    if(!result.canceled)setAsset(result.assets[0]);
  };
  return <View style={s.screen}><View style={s.composer}><TextInput multiline value={body} onChangeText={setBody} maxLength={4000} placeholder="No que você está pensando?" placeholderTextColor={theme.muted} style={s.input}/>
    {asset?<View style={s.asset}><Text style={s.assetText}>{asset.type==="video"?"🎬 Vídeo selecionado":"🖼️ Foto selecionada"}</Text><Pressable onPress={()=>setAsset(null)}><Text style={s.remove}>Remover</Text></Pressable></View>:null}
    {post.error?<Text style={s.error}>{post.error.message}</Text>:null}
    <View style={s.actions}><Pressable onPress={choose} style={s.secondary}><Text style={s.secondaryText}>Foto/Vídeo</Text></Pressable><Pressable disabled={(!body.trim()&&!asset)||post.isPending} onPress={()=>post.mutate()} style={s.button}><Text style={s.buttonText}>{post.isPending?"Enviando…":"Publicar"}</Text></Pressable></View></View>
    <FlatList refreshing={feed.isFetching} onRefresh={()=>feed.refetch()} data={feed.data?.data??[]} keyExtractor={x=>x.id} contentContainerStyle={s.list}
      ListHeaderComponent={me.data?<Text style={s.hello}>Olá, {me.data.data.displayName}.</Text>:null}
      ListEmptyComponent={<View style={s.card}><Text style={s.text}>Seu feed está vazio.</Text><Text style={s.muted}>Use Explorar para seguir pessoas.</Text></View>}
      renderItem={({item})=><View style={s.card}><Text style={s.author}>{item.displayName} <Text style={s.muted}>@{item.username}</Text></Text><Text style={s.text}>{item.body}</Text>{Array.isArray(item.media)&&item.media.length?<Text style={s.mediaLabel}>📎 {item.media.length} mídia(s)</Text>:null}<Text style={s.date}>{new Date(item.createdAt).toLocaleString("pt-BR")}</Text></View>}/>
  </View>;
}
const s=StyleSheet.create({screen:{flex:1},list:{padding:14,gap:11,paddingBottom:100},composer:{margin:14,marginBottom:0,backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:18,padding:12,gap:10},input:{minHeight:74,color:theme.text,textAlignVertical:"top"},actions:{flexDirection:"row",justifyContent:"space-between",gap:8},button:{backgroundColor:theme.brand,borderRadius:11,paddingVertical:9,paddingHorizontal:14},buttonText:{color:"white",fontWeight:"900"},secondary:{backgroundColor:theme.panel2,borderRadius:11,paddingVertical:9,paddingHorizontal:14},secondaryText:{color:theme.text,fontWeight:"800"},asset:{flexDirection:"row",justifyContent:"space-between",backgroundColor:theme.panel2,borderRadius:10,padding:10},assetText:{color:theme.text},remove:{color:"#fca5a5"},error:{color:"#fca5a5"},card:{backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:18,padding:16},author:{color:theme.text,fontWeight:"900",marginBottom:8},text:{color:theme.text,fontSize:16,lineHeight:22},muted:{color:theme.muted},date:{color:theme.muted,fontSize:11,marginTop:10},mediaLabel:{color:theme.brand,fontWeight:"800",marginTop:10},hello:{color:theme.text,fontSize:20,fontWeight:"900",marginBottom:12}});
