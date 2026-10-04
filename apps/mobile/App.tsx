import React,{useEffect,useState} from "react";
import {ActivityIndicator,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,View} from "react-native";
import {QueryClient,QueryClientProvider,useQuery} from "@tanstack/react-query";
import {api} from "./src/api";
import {clearToken,getToken} from "./src/auth";
import {theme} from "./src/theme";
import type {Me} from "./src/types";
import {LoginScreen,RegisterScreen} from "./src/screens/auth";
import {HomeScreen} from "./src/screens/home";
import {ExploreScreen} from "./src/screens/explore";
import {ReelsScreen} from "./src/screens/reels";
import {ChatScreen} from "./src/screens/chat";
import {LiveScreen} from "./src/screens/live";
import {ProfileScreen} from "./src/screens/profile";

const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:30000,retry:1,refetchOnReconnect:true}}});
type Tab="home"|"explore"|"reels"|"live"|"chat"|"profile";
const tabs:Array<{id:Tab;label:string}>=[
  {id:"home",label:"Início"},{id:"explore",label:"Explorar"},{id:"reels",label:"Reels"},
  {id:"live",label:"Ao vivo"},{id:"chat",label:"Chat"},{id:"profile",label:"Perfil"}
];

function Main({onLogout}:{onLogout:()=>void}){
  const [tab,setTab]=useState<Tab>("home");
  const me=useQuery({queryKey:["me"],queryFn:()=>api<Me>("/api/v1/auth/me")});
  if(me.isLoading)return <SafeAreaView style={s.center}><ActivityIndicator/><Text style={s.muted}>Carregando Seven Chat…</Text></SafeAreaView>;
  if(me.error)return <SafeAreaView style={s.center}><Text style={s.error}>{me.error.message}</Text><Pressable onPress={onLogout} style={s.primary}><Text style={s.primaryText}>Entrar novamente</Text></Pressable></SafeAreaView>;
  const user=me.data?.data;
  return <SafeAreaView style={s.page}>
    <View style={s.header}><View><Text style={s.logo}>Seven <Text style={s.brand}>Chat</Text></Text><Text style={s.muted}>@{user?.username}</Text></View><View style={s.dot}/></View>
    <View style={s.content}>
      {tab==="home"&&<HomeScreen/>}
      {tab==="explore"&&<ExploreScreen/>}
      {tab==="reels"&&<ReelsScreen/>}
      {tab==="live"&&<LiveScreen/>}
      {tab==="chat"&&<ChatScreen myId={user?.id??""}/>}
      {tab==="profile"&&<ProfileScreen onLogout={onLogout}/>}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabWrap} contentContainerStyle={s.tabs}>
      {tabs.map(v=><Pressable accessibilityRole="button" accessibilityState={{selected:tab===v.id}} key={v.id} onPress={()=>setTab(v.id)} style={[s.tab,tab===v.id&&s.tabActive]}><Text style={[s.tabText,tab===v.id&&s.tabTextActive]}>{v.label}</Text></Pressable>)}
    </ScrollView>
  </SafeAreaView>;
}

function AppRoot(){
  const [ready,setReady]=useState(false),[logged,setLogged]=useState(false),[register,setRegister]=useState(false);
  useEffect(()=>{getToken().then(t=>setLogged(Boolean(t))).finally(()=>setReady(true));},[]);
  const logout=async()=>{await clearToken();queryClient.clear();setLogged(false);setRegister(false);};
  if(!ready)return <SafeAreaView style={s.center}><ActivityIndicator/></SafeAreaView>;
  if(!logged)return register?<RegisterScreen onBack={()=>setRegister(false)}/>:<LoginScreen onDone={()=>setLogged(true)} onRegister={()=>setRegister(true)}/>;
  return <Main onLogout={logout}/>;
}

export default function App(){return <QueryClientProvider client={queryClient}><AppRoot/></QueryClientProvider>}

const s=StyleSheet.create({
  page:{flex:1,backgroundColor:theme.bg},content:{flex:1},center:{flex:1,backgroundColor:theme.bg,alignItems:"center",justifyContent:"center",padding:20,gap:12},
  header:{height:68,paddingHorizontal:16,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomColor:theme.border,borderBottomWidth:1},
  logo:{fontSize:23,fontWeight:"900",color:theme.text},brand:{color:theme.brand},muted:{color:theme.muted},error:{color:"#fca5a5",textAlign:"center"},
  dot:{width:10,height:10,borderRadius:5,backgroundColor:"#22c55e"},primary:{backgroundColor:theme.brand,borderRadius:12,paddingVertical:11,paddingHorizontal:16},primaryText:{color:"white",fontWeight:"900"},
  tabWrap:{maxHeight:66,borderTopWidth:1,borderTopColor:theme.border,backgroundColor:"#0b0910"},tabs:{alignItems:"center",paddingHorizontal:8,gap:4},tab:{paddingVertical:10,paddingHorizontal:13,borderRadius:12},tabActive:{backgroundColor:theme.panel2},tabText:{color:theme.muted,fontSize:12,fontWeight:"700"},tabTextActive:{color:theme.text}
});
