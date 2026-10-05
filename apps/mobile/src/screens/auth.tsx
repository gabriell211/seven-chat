import React,{useState} from "react";
import {Platform,Pressable,SafeAreaView,StyleSheet,Text,TextInput,View} from "react-native";
import {api} from "../api";
import {setToken} from "../auth";
import {theme} from "../theme";

export function LoginScreen({onDone,onRegister}:{onDone:()=>void;onRegister:()=>void}){
  const [identifier,setIdentifier]=useState(""),[password,setPassword]=useState(""),[totpCode,setTotpCode]=useState(""),[needsTotp,setNeedsTotp]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const submit=async()=>{if(busy)return;setBusy(true);setError("");try{
    const result=await api<{data:{accessToken:string}}>("/api/v1/auth/login",{method:"POST",body:JSON.stringify({identifier,password,totpCode:totpCode||undefined,deviceName:"Seven Chat Mobile",platform:Platform.OS==="ios"?"ios":"android"})});
    await setToken(result.data.accessToken);onDone();
  }catch(e){const m=e instanceof Error?e.message:"Falha ao entrar";if(m.includes("TOTP_REQUIRED")||m.toLowerCase().includes("autenticador"))setNeedsTotp(true);setError(m);}finally{setBusy(false)}};
  return <SafeAreaView style={s.center}><View style={s.card}><Text style={s.logo}>Seven <Text style={s.brand}>Chat</Text></Text><Text style={s.muted}>Entre para continuar</Text>
    <TextInput accessibilityLabel="E-mail ou usuário" autoCapitalize="none" value={identifier} onChangeText={setIdentifier} placeholder="E-mail ou @usuário" placeholderTextColor={theme.muted} style={s.input}/>
    <TextInput accessibilityLabel="Senha" secureTextEntry value={password} onChangeText={setPassword} placeholder="Senha" placeholderTextColor={theme.muted} style={s.input}/>
    {needsTotp?<TextInput accessibilityLabel="Código do autenticador" keyboardType="number-pad" maxLength={6} value={totpCode} onChangeText={setTotpCode} placeholder="Código de 6 dígitos" placeholderTextColor={theme.muted} style={s.input}/>:null}
    {error?<Text style={s.error}>{error}</Text>:null}<Pressable onPress={submit} style={s.button} disabled={busy}><Text style={s.buttonText}>{busy?"Entrando…":"Entrar"}</Text></Pressable>
    <Pressable onPress={onRegister}><Text style={s.link}>Criar conta</Text></Pressable>
  </View></SafeAreaView>;
}

export function RegisterScreen({onBack}:{onBack:()=>void}){
  const [displayName,setDisplayName]=useState(""),[username,setUsername]=useState(""),[email,setEmail]=useState(""),[birthDate,setBirthDate]=useState(""),[password,setPassword]=useState(""),[status,setStatus]=useState(""),[busy,setBusy]=useState(false);
  const submit=async()=>{if(busy)return;setBusy(true);setStatus("");try{
    await api("/api/v1/auth/register",{method:"POST",body:JSON.stringify({displayName,username,email,birthDate,password,termsAccepted:true})});
    setStatus("Conta criada. Confira seu e-mail para ativar a conta.");
  }catch(e){setStatus(e instanceof Error?e.message:"Não foi possível cadastrar.");}finally{setBusy(false)}};
  return <SafeAreaView style={s.center}><View style={s.card}><Text style={s.logo}>Criar conta</Text><Text style={s.muted}>Idade permitida: 13 a 99 anos.</Text>
    <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Nome" placeholderTextColor={theme.muted} style={s.input}/>
    <TextInput autoCapitalize="none" value={username} onChangeText={setUsername} placeholder="@usuário" placeholderTextColor={theme.muted} style={s.input}/>
    <TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="E-mail" placeholderTextColor={theme.muted} style={s.input}/>
    <TextInput value={birthDate} onChangeText={setBirthDate} placeholder="Nascimento: AAAA-MM-DD" placeholderTextColor={theme.muted} style={s.input}/>
    <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Senha (mín. 10 caracteres)" placeholderTextColor={theme.muted} style={s.input}/>
    <Text style={s.consent}>Ao criar a conta, você aceita os Termos e a Política de Privacidade atuais do Seven Chat.</Text>
    {status?<Text style={status.startsWith("Conta criada")?s.success:s.error}>{status}</Text>:null}
    <Pressable onPress={submit} style={s.button} disabled={busy}><Text style={s.buttonText}>{busy?"Criando…":"Criar conta"}</Text></Pressable>
    <Pressable onPress={onBack}><Text style={s.link}>Voltar para entrar</Text></Pressable>
  </View></SafeAreaView>;
}
const s=StyleSheet.create({center:{flex:1,backgroundColor:theme.bg,alignItems:"center",justifyContent:"center",padding:20},card:{width:"100%",maxWidth:430,backgroundColor:theme.panel,borderColor:theme.border,borderWidth:1,borderRadius:24,padding:22,gap:13},logo:{fontSize:27,fontWeight:"900",color:theme.text},brand:{color:theme.brand},muted:{color:theme.muted},input:{backgroundColor:"#0d0b13",borderColor:theme.border,borderWidth:1,borderRadius:13,padding:13,color:theme.text},button:{backgroundColor:theme.brand,borderRadius:13,padding:14,alignItems:"center"},buttonText:{color:"white",fontWeight:"900"},link:{color:theme.brand,textAlign:"center",fontWeight:"800",padding:8},error:{color:"#fca5a5"},success:{color:"#86efac"},consent:{color:theme.muted,fontSize:12,lineHeight:17}});
