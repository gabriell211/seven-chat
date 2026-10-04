import React,{useState} from "react";
import {FlatList,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {api} from "../api";
import {theme} from "../theme";
import type {Feed,Me} from "../types";

export function HomeScreen(){
  const qc=useQueryClient(),[body,setBody]=useState("");
  const me=useQuery({queryKey:["me"],queryFn:()=>api<Me>("/api/v1/auth/me")});
  const feed=useQuery({queryKey:["feed"],queryFn:()=>api<Feed>("/api/v1/feed")});
  const post=useMutation({mutationFn:()=>api("/api/v1/posts",{method:"POST",body:JSON.stringify({body,visibility:"public",commentsEnabled:true,mediaAssetIds:[]})}),onSuccess:async()=>{setBody("");await qc.invalidateQueries({queryKey:["feed"]});}});
  return <View style={s.screen}><View style={s.composer}><TextInput multiline value={body} onChangeText={setBody} maxLength={4000} placeholder="No que você está pensando?" placeholderTextColor={theme.muted} style={s.input}/><Pressable disabled={!body.trim()||post.isPending} onPress={()=>post.mutate()} style={s.button}><Text style={s.buttonText}>{post.isPending?"…":"Publicar"}</Text></Pressable></View>
    <FlatList refreshing={feed.isFetching} onRefresh={()=>feed.refetch()} data={feed.data?.data??[]} keyExtractor={x=>x.id} contentContainerStyle={s.list}
      ListHeaderComponent={me.data?<Text style={s.hello}>Olá, {me.data.data.displayName}.</Text>:null}
      ListEmptyComponent={<View style={s.card}><Text style={s.text}>Seu feed está vazio.</Text><Text style={s.muted}>Use Explorar para seguir pessoas.</Text></View>}
      renderItem={({item})=><View style={s.card}><Text style={s.author}>{item.displayName} <Text style={s.muted}>@{item.username}</Text></Text><Text style={s.text}>{item.body}</Text><Text style={s.date}>{new Date(item.createdAt).toLocaleString("pt-BR")}</Text></View>}/>
  </View>;
}
const s=StyleSheet.create({screen:{flex:1},list:{padding:14,gap:11,paddingBottom:100},composer:{margin:14,marginBottom:0,backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:18,padding:12,gap:10},input:{minHeight:74,color:theme.text,textAlignVertical:"top"},button:{alignSelf:"flex-end",backgroundColor:theme.brand,borderRadius:11,paddingVertical:9,paddingHorizontal:14},buttonText:{color:"white",fontWeight:"900"},card:{backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:18,padding:16},author:{color:theme.text,fontWeight:"900",marginBottom:8},text:{color:theme.text,fontSize:16,lineHeight:22},muted:{color:theme.muted},date:{color:theme.muted,fontSize:11,marginTop:10},hello:{color:theme.text,fontSize:20,fontWeight:"900",marginBottom:12}});
