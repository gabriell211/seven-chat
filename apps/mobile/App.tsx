import React,{useEffect,useState} from "react";
import {ActivityIndicator,FlatList,Platform,Pressable,SafeAreaView,StyleSheet,Text,TextInput,View} from "react-native";
import {QueryClient,QueryClientProvider,useQuery} from "@tanstack/react-query";
import {api} from "./src/api";
import {clearToken,getToken,setToken} from "./src/auth";
import {theme} from "./src/theme";

const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:30000,retry:1}}});
type Me={data:{id:string;username:string;displayName:string;age:number;avatarUrl:string|null;isVip:boolean}};
type Feed={data:Array<{id:string;body:string;createdAt:string;username:string;displayName:string}>;nextCursor:string|null};

function Login({onDone}:{onDone:()=>void}){
  const [identifier,setIdentifier]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState("");
  const submit=async()=>{try{
    setError("");
    const result=await api<{data:{accessToken:string}}>("/api/v1/auth/login",{method:"POST",body:JSON.stringify({identifier,password,deviceName:"Seven Chat Mobile",platform:Platform.OS==="ios"?"ios":"android"})});
    await setToken(result.data.accessToken);onDone();
  }catch(e){setError(e instanceof Error?e.message:"Falha ao entrar");}};
  return <SafeAreaView style={s.center}><View style={s.authCard}><Text style={s.logo}>Seven <Text style={s.brand}>Chat</Text></Text><Text style={s.muted}>Entre para continuar</Text><TextInput accessibilityLabel="E-mail ou usuário" autoCapitalize="none" value={identifier} onChangeText={setIdentifier} placeholder="E-mail ou @usuário" placeholderTextColor={theme.muted} style={s.input}/><TextInput accessibilityLabel="Senha" secureTextEntry value={password} onChangeText={setPassword} placeholder="Senha" placeholderTextColor={theme.muted} style={s.input}/>{error?<Text style={s.error}>{error}</Text>:null}<Pressable accessibilityRole="button" onPress={submit} style={s.button}><Text style={s.buttonText}>Entrar</Text></Pressable></View></SafeAreaView>;
}

function Home({onLogout}:{onLogout:()=>void}){
  const me=useQuery({queryKey:["me"],queryFn:()=>api<Me>("/api/v1/auth/me")});
  const feed=useQuery({queryKey:["feed"],queryFn:()=>api<Feed>("/api/v1/feed")});
  if(me.isLoading||feed.isLoading)return <SafeAreaView style={s.center}><ActivityIndicator/><Text style={s.muted}>Carregando Seven Chat…</Text></SafeAreaView>;
  return <SafeAreaView style={s.page}>
    <View style={s.header}><View><Text style={s.logo}>Seven <Text style={s.brand}>Chat</Text></Text><Text style={s.muted}>{me.data?"@"+me.data.data.username:""}</Text></View><Pressable onPress={onLogout}><Text style={s.muted}>Sair</Text></Pressable></View>
    {feed.error?<View style={s.card}><Text style={s.error}>{feed.error.message}</Text></View>:<FlatList data={feed.data?.data??[]} keyExtractor={x=>x.id} contentContainerStyle={s.list} ListEmptyComponent={<View style={s.card}><Text style={s.text}>Seu feed está vazio.</Text><Text style={s.muted}>Siga pessoas e publique no Seven Chat.</Text></View>} renderItem={({item})=><View style={s.card}><Text style={s.author}>{item.displayName} <Text style={s.muted}>@{item.username}</Text></Text><Text style={s.text}>{item.body}</Text></View>}/>}
    <View style={s.tabs}>{["Início","Explorar","Reels","Chat","Perfil"].map(v=><Text key={v} style={v==="Início"?s.brand:s.muted}>{v}</Text>)}</View>
  </SafeAreaView>;
}

function AppRoot(){
  const [ready,setReady]=useState(false),[logged,setLogged]=useState(false);
  useEffect(()=>{getToken().then(t=>setLogged(Boolean(t))).finally(()=>setReady(true));},[]);
  if(!ready)return <SafeAreaView style={s.center}><ActivityIndicator/></SafeAreaView>;
  return logged?<Home onLogout={async()=>{await clearToken();queryClient.clear();setLogged(false);}}/>:<Login onDone={()=>setLogged(true)}/>;
}
export default function App(){return <QueryClientProvider client={queryClient}><AppRoot/></QueryClientProvider>}

const s=StyleSheet.create({
  page:{flex:1,backgroundColor:theme.bg},center:{flex:1,backgroundColor:theme.bg,alignItems:"center",justifyContent:"center",padding:20,gap:12},
  authCard:{width:"100%",maxWidth:430,backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:24,padding:22,gap:14},
  header:{paddingHorizontal:18,paddingVertical:14,flexDirection:"row",justifyContent:"space-between",alignItems:"center",borderBottomWidth:1,borderBottomColor:theme.border},
  logo:{fontSize:24,fontWeight:"900",color:theme.text},brand:{color:theme.brand,fontWeight:"800"},muted:{color:theme.muted},text:{color:theme.text,fontSize:16,lineHeight:23},author:{color:theme.text,fontWeight:"800",marginBottom:9},
  input:{backgroundColor:"#0d0b13",borderColor:theme.border,borderWidth:1,borderRadius:13,padding:13,color:theme.text},
  button:{backgroundColor:theme.brand,borderRadius:13,padding:14,alignItems:"center"},buttonText:{color:"white",fontWeight:"900"},error:{color:"#fca5a5"},
  list:{padding:16,gap:12,paddingBottom:88},card:{backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:18,padding:16},
  tabs:{position:"absolute",left:0,right:0,bottom:0,height:68,backgroundColor:"#0b0910",borderTopColor:theme.border,borderTopWidth:1,flexDirection:"row",alignItems:"center",justifyContent:"space-around"}
});