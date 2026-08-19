import React,{useMemo,useState} from "react";
import {View,Text,StyleSheet,TextInput,Alert} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {Ionicons} from "@expo/vector-icons";
import {useLocalSearchParams,useRouter} from "expo-router";
import {api} from "@/src/api";
import {theme} from "@/src/theme";
import PressableScale from "@/src/components/PressableScale";

const REASONS=[
 {key:'scam',label:'Scam or suspicious'},
 {key:'counterfeit',label:'Counterfeit'},
 {key:'prohibited',label:'Prohibited item'},
 {key:'misleading',label:'Misleading description'},
 {key:'other',label:'Other'},
] as const;

export default function ReportListing(){
 const {id}=useLocalSearchParams<{id:string}>(); const router=useRouter();
 const [reason,setReason]=useState<(typeof REASONS)[number]['key']>('scam'); const [details,setDetails]=useState(''); const [busy,setBusy]=useState(false);
 const valid=useMemo(()=>!!id&&!busy,[id,busy]);
 const submit=async()=>{if(!id)return;setBusy(true);try{await api.report(id,reason,details.trim()||undefined);Alert.alert('Report received','Thank you. The report has been stored for review.',[{text:'Done',onPress:()=>router.back()}]);}catch(e:any){Alert.alert('Could not report',e?.message||'Try again')}finally{setBusy(false)}};
 return <SafeAreaView style={s.safe}><View style={s.wrap}>
  <View style={s.top}><PressableScale onPress={()=>router.back()} style={s.circle}><Ionicons name="arrow-back" size={20} color={theme.color.text}/></PressableScale><Text style={s.title}>Report listing</Text><View style={{width:42}}/></View>
  <Text style={s.intro}>Choose the reason that best describes the problem. Reports are reviewed; one report does not automatically remove a seller.</Text>
  <View style={s.reasons}>{REASONS.map(r=><PressableScale key={r.key} onPress={()=>setReason(r.key)} style={[s.reason,reason===r.key&&s.reasonOn]}><View style={[s.radio,reason===r.key&&s.radioOn]}>{reason===r.key&&<View style={s.radioDot}/>}</View><Text style={s.reasonTxt}>{r.label}</Text></PressableScale>)}</View>
  <Text style={s.label}>Optional details</Text><TextInput value={details} onChangeText={setDetails} maxLength={1000} multiline placeholder="Tell us what you noticed…" placeholderTextColor={theme.color.textFaint} style={s.input}/>
  <PressableScale disabled={!valid} onPress={submit} style={s.submit}><Ionicons name="flag" size={17} color={theme.color.onLime}/><Text style={s.submitTxt}>{busy?'Sending…':'Submit report'}</Text></PressableScale>
 </View></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:theme.color.bg},wrap:{padding:20},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},circle:{width:42,height:42,borderRadius:21,backgroundColor:theme.color.surface,borderWidth:1,borderColor:theme.color.border,alignItems:'center',justifyContent:'center'},title:{color:theme.color.text,fontFamily:theme.font.displayBold,fontSize:19},intro:{color:theme.color.textMuted,fontFamily:theme.font.text,fontSize:13,lineHeight:20,marginTop:24},reasons:{gap:9,marginTop:18},reason:{height:54,borderRadius:16,backgroundColor:theme.color.surface,borderWidth:1,borderColor:theme.color.border,flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:12},reasonOn:{borderColor:theme.color.lime,backgroundColor:theme.color.limeSoft},radio:{width:20,height:20,borderRadius:10,borderWidth:1,borderColor:theme.color.textMuted,alignItems:'center',justifyContent:'center'},radioOn:{borderColor:theme.color.lime},radioDot:{width:10,height:10,borderRadius:5,backgroundColor:theme.color.lime},reasonTxt:{color:theme.color.text,fontFamily:theme.font.textSemi,fontSize:14},label:{color:theme.color.textMuted,fontFamily:theme.font.textBold,fontSize:10,letterSpacing:1.1,textTransform:'uppercase',marginTop:22,marginBottom:7},input:{height:120,borderRadius:16,backgroundColor:theme.color.surface,borderWidth:1,borderColor:theme.color.border,color:theme.color.text,fontFamily:theme.font.text,padding:14,textAlignVertical:'top'},submit:{height:56,borderRadius:17,backgroundColor:theme.color.lime,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:18},submitTxt:{color:theme.color.onLime,fontFamily:theme.font.textBold,fontSize:15}})
