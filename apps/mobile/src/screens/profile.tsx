import React from "react";
import {FlatList,Pressable,StyleSheet,Text,View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {api} from "../api";
import {theme} from "../theme";
import type {Me,Notifications,Wallet} from "../types";

export function ProfileScreen({onLogout}:{onLogout:()=>void}){
  const me=useQuery({queryKey:["me"],queryFn:()=>api<Me>("/api/v1/auth/me")});
  const wallet=useQuery({queryKey:["wallet"],queryFn:()=>api<Wallet>("/api/v1/wallet")});
  const notifications=useQuery({queryKey:["notifications"],queryFn:()=>api<Notifications>("/api/v1/notifications")});
  const p=me.data?.data;
  return <FlatList data={notifications.data?.data??[]} keyExtractor={x=>x.id} contentContainerStyle={s.list} ListHeaderComponent={<View style={s.stack}><View style={s.card}><Text style={s.name}>{p?.displayName??"Perfil"} {p?.isVip?"◆":""}</Text><Text style={s.muted}>@{p?.username??""} · {p?.age??"?"} anos</Text><Text style={s.bio}>{p?.bio||"Sem bio ainda."}</Text></View><View style={s.card}><Text style={s.label}>Carteira</Text><Text style={s.balance}>💎 {wallet.data?.data.balance??0}</Text></View><Text style={s.section}>Notificações</Text></View>} ListEmptyComponent={<Text style={s.muted}>Sem notificações.</Text>} renderItem={({item})=><View style={s.notification}><Text style={s.text}>{item.type.replaceAll("_"," ")}</Text><Text style={s.muted}>{new Date(item.createdAt).toLocaleString("pt-BR")}</Text></View>} ListFooterComponent={<Pressable onPress={onLogout} style={s.logout}><Text style={s.logoutText}>Sair da conta</Text></Pressable>}/>;
}
const s=StyleSheet.create({list:{padding:14,gap:9,paddingBottom:110},stack:{gap:12},card:{backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:18,padding:17},name:{color:theme.text,fontSize:22,fontWeight:"900"},muted:{color:theme.muted,marginTop:4},bio:{color:theme.text,marginTop:10},label:{color:theme.muted},balance:{color:theme.text,fontSize:30,fontWeight:"900",marginTop:4},section:{color:theme.text,fontSize:19,fontWeight:"900",marginTop:6},notification:{backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:14,padding:13},text:{color:theme.text},logout:{marginTop:18,borderColor:"#7f1d1d",borderWidth:1,borderRadius:13,padding:13,alignItems:"center"},logoutText:{color:"#fca5a5",fontWeight:"900"}});
