import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/src/theme";
import { useAuth } from "@/src/auth";
import PressableScale from "@/src/components/PressableScale";

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<"login"|"register">("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [location,setLocation]=useState("");
  const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const [isAdult,setIsAdult]=useState(false);
  const submit=async()=>{if(mode==="register"&&!isAdult){setError("Please confirm you are 18 or older.");return;}setBusy(true);setError("");try{ if(mode==="login") await signIn(email,password); else await register(email,password,name,location); router.back(); }catch(e:any){setError(e?.message?.replace(/^HTTP \d+:\s*/,"")||"Unable to continue");}finally{setBusy(false)}};
  return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
    <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="close" size={22} color={theme.color.text}/></Pressable>
    <View style={s.logo}><Ionicons name="flash" size={22} color={theme.color.onLime}/></View>
    <Text style={s.kicker}>VENDO ACCOUNT</Text><Text style={s.title}>{mode==='login'?'Welcome back':'Create your seller account'}</Text>
    <Text style={s.sub}>{mode==='login'?'Sign in to publish, save and contact sellers.':'Your account securely owns every listing you publish.'}</Text>
    {mode==='register'&&<><TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={theme.color.textFaint} style={s.input}/><TextInput value={location} onChangeText={setLocation} placeholder="City / area (optional)" placeholderTextColor={theme.color.textFaint} style={s.input}/></>}
    <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={theme.color.textFaint} style={s.input}/>
    <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password (8+ characters)" placeholderTextColor={theme.color.textFaint} style={s.input}/>
    {mode==='register'&&<Pressable testID="age-checkbox" accessibilityRole="checkbox" accessibilityState={{checked:isAdult}} onPress={()=>{setIsAdult(!isAdult);setError('')}} style={s.ageRow}><View style={[s.box,isAdult&&s.boxOn]}>{isAdult&&<Ionicons name="checkmark" size={16} color={theme.color.onLime}/>}</View><Text style={s.ageTxt}>I am 18 or older</Text></Pressable>}
    {!!error&&<Text style={s.err}>{error}</Text>}
    <PressableScale testID="auth-submit" onPress={submit} disabled={busy||(mode==='register'&&!isAdult)} style={[s.primary,mode==='register'&&!isAdult&&{opacity:0.45}]}><Text style={s.primaryTxt}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</Text></PressableScale>
    <Pressable onPress={()=>{setMode(mode==='login'?'register':'login');setError('')}} style={s.switch}><Text style={s.switchTxt}>{mode==='login'?"New to Vendo? Create an account":"Already have an account? Sign in"}</Text></Pressable>
    <Text style={s.legal} testID="auth-legal">By {mode==='register'?'signing up':'continuing'} you accept the <Text style={s.legalLink} onPress={()=>router.push('/legal/terms')}>Terms</Text> and <Text style={s.legalLink} onPress={()=>router.push('/legal/privacy')}>Privacy Policy</Text>.</Text>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:theme.color.bg},wrap:{padding:24,paddingBottom:60},back:{width:42,height:42,borderRadius:21,backgroundColor:theme.color.surface,alignItems:'center',justifyContent:'center',alignSelf:'flex-end'},logo:{width:52,height:52,borderRadius:16,backgroundColor:theme.color.lime,alignItems:'center',justifyContent:'center',marginTop:38},kicker:{color:theme.color.lime,fontFamily:theme.font.textBold,fontSize:11,letterSpacing:2,marginTop:20},title:{color:theme.color.text,fontFamily:theme.font.displayBold,fontSize:34,letterSpacing:-1,marginTop:8},sub:{color:theme.color.textMuted,fontFamily:theme.font.text,fontSize:14,lineHeight:21,marginTop:10,marginBottom:24},input:{height:56,borderRadius:16,backgroundColor:theme.color.surface,borderWidth:1,borderColor:theme.color.border,color:theme.color.text,paddingHorizontal:16,fontFamily:theme.font.text,fontSize:15,marginBottom:10},err:{color:theme.color.error,fontSize:13,marginVertical:6},primary:{height:58,borderRadius:18,backgroundColor:theme.color.lime,alignItems:'center',justifyContent:'center',marginTop:10},primaryTxt:{color:theme.color.onLime,fontFamily:theme.font.textBold,fontSize:16},switch:{paddingVertical:18,alignItems:'center'},switchTxt:{color:theme.color.lime,fontFamily:theme.font.textSemi,fontSize:14},legal:{color:theme.color.textFaint,fontFamily:theme.font.text,fontSize:11,lineHeight:17,textAlign:'center',marginTop:14},legalLink:{color:theme.color.lime,textDecorationLine:'underline'},ageRow:{flexDirection:'row',alignItems:'center',gap:12,minHeight:48,marginTop:4},box:{width:24,height:24,borderRadius:7,borderWidth:2,borderColor:theme.color.borderStrong,alignItems:'center',justifyContent:'center'},boxOn:{backgroundColor:theme.color.lime,borderColor:theme.color.lime},ageTxt:{color:theme.color.text,fontFamily:theme.font.text,fontSize:14}})
