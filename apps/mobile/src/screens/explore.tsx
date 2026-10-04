import React,{useState} from "react";
import {FlatList,Pressable,StyleSheet,Text,TextInput,View} from "react-native";
import {useMutation,useQuery,useQueryClient} from "@tanstack/react-query";
import {api} from "../api";
import {theme} from "../theme";
import type {SearchResult} from "../types";

export function ExploreScreen(){
  const [q,setQ]=useState(""),qc=useQueryClient();
  const search=useQuery({queryKey:["search",q],queryFn:()=>api<SearchResult>("/api/v1/search?q="+encodeURIComponent(q)),enabled:q.trim().length>=2});
  const follow=useMutation({mutationFn:(id:string)=>api("/api/v1/users/"+id+"/follow",{method:"POST"}),onSuccess:()=>qc.invalidateQueries({queryKey:["search",q]})});
  return <View style={s.screen}><TextInput value={q} onChangeText={setQ} autoCapitalize="none" placeholder="Buscar pessoas, posts, lives e salas" placeholderTextColor={theme.muted} style={s.search}/>
    {q.trim().length<2?<View style={s.empty}><Text style={s.muted}>Digite pelo menos 2 caracteres.</Text></View>:<FlatList data={search.data?.data.users??[]} keyExtractor={x=>x.id} contentContainerStyle={s.list} ListHeaderComponent={<Text style={s.title}>Pessoas</Text>} ListEmptyComponent={<Text style={s.muted}>Nenhum perfil encontrado.</Text>} renderItem={({item})=><View style={s.card}><View style={{flex:1}}><Text style={s.name}>{item.displayName} {item.isVip?"◆":""}</Text><Text style={s.muted}>@{item.username}</Text><Text style={s.bio}>{item.bio}</Text></View><Pressable onPress={()=>follow.mutate(item.id)} style={s.follow}><Text style={s.followText}>Seguir</Text></Pressable></View>}/>}
  </View>;
}
const s=StyleSheet.create({screen:{flex:1,padding:14},search:{backgroundColor:"#0d0b13",color:theme.text,borderColor:theme.border,borderWidth:1,borderRadius:14,padding:13},list:{paddingTop:16,gap:10,paddingBottom:100},title:{color:theme.text,fontSize:20,fontWeight:"900",marginBottom:4},card:{flexDirection:"row",gap:12,alignItems:"center",backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:16,padding:14},name:{color:theme.text,fontWeight:"900"},muted:{color:theme.muted},bio:{color:theme.text,marginTop:6},follow:{backgroundColor:theme.brand,borderRadius:10,paddingVertical:8,paddingHorizontal:12},followText:{color:"white",fontWeight:"800"},empty:{padding:24,alignItems:"center"}});
