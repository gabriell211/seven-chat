import React,{useState} from "react";
import {FlatList,Linking,Pressable,StyleSheet,Text,View} from "react-native";
import {useQuery} from "@tanstack/react-query";
import {api} from "../api";
import {theme} from "../theme";
import type {Me,Notifications,Wallet} from "../types";
type Catalog={data:{diamonds:Array<{sku:string;diamonds:number;bonusDiamonds:number;priceMinor:number;currency:string}>;vip:Array<{code:string;tier:string;durationDays:number;priceMinor:number;currency:string}>}};
type Checkout={data:{checkoutUrl:string}};
export function ProfileScreen({onLogout}:{onLogout:()=>void}){
  const [buying,setBuying]=useState<string|null>(null),[buyError,setBuyError]=useState("");
  const me=useQuery({queryKey:["me"],queryFn:()=>api<Me>("/api/v1/auth/me")});
  const wallet=useQuery({queryKey:["wallet"],queryFn:()=>api<Wallet>("/api/v1/wallet")});
  const notifications=useQuery({queryKey:["notifications"],queryFn:()=>api<Notifications>("/api/v1/notifications")});
  const catalog=useQuery({queryKey:["store-catalog"],queryFn:()=>api<Catalog>("/api/v1/store/catalog")});
  const p=me.data?.data;
  const buy=async(productType:"diamonds"|"vip",sku:string)=>{try{setBuyError("");setBuying(sku);const r=await api<Checkout>("/api/v1/store/infinitepay/checkout",{method:"POST",body:JSON.stringify({productType,sku})});await Linking.openURL(r.data.checkoutUrl);}catch(e){setBuyError(e instanceof Error?e.message:"Falha ao abrir pagamento.");}finally{setBuying(null);}};
  const money=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n/100);
  return <FlatList data={notifications.data?.data??[]} keyExtractor={x=>x.id} contentContainerStyle={s.list} ListHeaderComponent={<View style={s.stack}>
    <View style={s.card}><Text style={s.name}>{p?.displayName??"Perfil"} {p?.isVip?"◆":""}</Text><Text style={s.muted}>@{p?.username??""} · {p?.age??"?"} anos</Text><Text style={s.bio}>{p?.bio||"Sem bio ainda."}</Text></View>
    <View style={s.card}><Text style={s.label}>Carteira</Text><Text style={s.balance}>💎 {wallet.data?.data.balance??0}</Text></View>
    <View style={s.card}><Text style={s.section}>Comprar com Pix ou cartão</Text><Text style={s.muted}>Pagamento seguro pela InfinitePay. A liberação acontece após confirmação do pagamento.</Text>{buyError?<Text style={s.error}>{buyError}</Text>:null}
      {catalog.data?.data.diamonds.map(x=><Pressable key={x.sku} disabled={buying!==null} onPress={()=>buy("diamonds",x.sku)} style={s.buy}><Text style={s.buyText}>💎 {x.diamonds+x.bonusDiamonds} diamantes</Text><Text style={s.buyPrice}>{buying===x.sku?"Abrindo…":money(x.priceMinor)}</Text></Pressable>)}
      {catalog.data?.data.vip.map(x=><Pressable key={x.code} disabled={buying!==null} onPress={()=>buy("vip",x.code)} style={s.buy}><Text style={s.buyText}>◆ VIP {x.tier} · {x.durationDays} dias</Text><Text style={s.buyPrice}>{buying===x.code?"Abrindo…":money(x.priceMinor)}</Text></Pressable>)}
    </View>
    <Text style={s.section}>Notificações</Text></View>} ListEmptyComponent={<Text style={s.muted}>Sem notificações.</Text>} renderItem={({item})=><View style={s.notification}><Text style={s.text}>{item.type.replaceAll("_"," ")}</Text><Text style={s.muted}>{new Date(item.createdAt).toLocaleString("pt-BR")}</Text></View>} ListFooterComponent={<Pressable onPress={onLogout} style={s.logout}><Text style={s.logoutText}>Sair da conta</Text></Pressable>}/>;
}
const s=StyleSheet.create({list:{padding:14,gap:9,paddingBottom:110},stack:{gap:12},card:{backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:18,padding:17,gap:8},name:{color:theme.text,fontSize:22,fontWeight:"900"},muted:{color:theme.muted,marginTop:4},bio:{color:theme.text,marginTop:10},label:{color:theme.muted},balance:{color:theme.text,fontSize:30,fontWeight:"900",marginTop:4},section:{color:theme.text,fontSize:19,fontWeight:"900",marginTop:6},notification:{backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:14,padding:13},text:{color:theme.text},error:{color:"#fca5a5",marginTop:6},buy:{marginTop:7,backgroundColor:theme.panel2,borderColor:theme.border,borderWidth:1,borderRadius:13,padding:13,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},buyText:{color:theme.text,fontWeight:"800",flex:1},buyPrice:{color:theme.brand,fontWeight:"900",marginLeft:10},logout:{marginTop:18,borderColor:"#7f1d1d",borderWidth:1,borderRadius:13,padding:13,alignItems:"center"},logoutText:{color:"#fca5a5",fontWeight:"900"}});
