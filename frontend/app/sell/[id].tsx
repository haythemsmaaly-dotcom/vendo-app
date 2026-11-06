import React,{useEffect,useState} from "react";
import {View,Text,StyleSheet,TextInput,ScrollView,KeyboardAvoidingView,Platform} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {Image} from "expo-image";
import {Ionicons} from "@expo/vector-icons";
import {useLocalSearchParams,useRouter} from "expo-router";
import {api,Item} from "@/src/api";
import {theme} from "@/src/theme";
import PressableScale from "@/src/components/PressableScale";
import {useAuth} from "@/src/auth";
import {useSettings} from "@/src/i18n/SettingsContext";
import SellingCoach from "@/src/components/SellingCoach";

export default function SellReview(){
 const {id}=useLocalSearchParams<{id:string}>(); const router=useRouter(); const {user}=useAuth(); const {formatMoney}=useSettings();
 const [item,setItem]=useState<Item|null>(null); const [title,setTitle]=useState('');const[desc,setDesc]=useState('');const[price,setPrice]=useState('');const[condition,setCondition]=useState('');const[category,setCategory]=useState('');const[location,setLocation]=useState(user?.location_label||'');const[busy,setBusy]=useState(false);const[error,setError]=useState('');
 useEffect(()=>{if(id)api.get(id).then(x=>{setItem(x);setTitle(x.listing.title);setDesc(x.listing.description);setPrice(String(x.listing.price));setCondition(x.condition);setCategory(x.category)}).catch(e=>setError(String(e)))},[id]);
 if(!item)return <SafeAreaView style={s.safe}><Text style={s.loading}>Loading listing…</Text></SafeAreaView>;
 const publish=async()=>{setBusy(true);setError('');try{
  let working=item;
  const status=await api.uploadStatus();
  const localPhotos=(working.photos?.length?working.photos:[working.photo]).filter(Boolean);
  const needsUpload=localPhotos.some(p=>p.startsWith('data:'));
  if(needsUpload){
    if(!status.configured) throw new Error('Cloud image storage is not configured yet. Add Cloudinary credentials before public marketplace launch.');
    const uploaded=await api.uploadPhotos(localPhotos);
    working=await api.update(working.id,{photo:uploaded.photos[0],photos:uploaded.photos} as any);
    setItem(working);
  }
  await api.publish(working.id,{title,description:desc,price:Number(price)||working.listing.price,condition,category,location_label:location});
  router.replace(`/marketplace/${working.id}`)
}catch(e:any){setError(e?.message||'Could not publish')}finally{setBusy(false)}};
 return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
  <View style={s.top}><PressableScale onPress={()=>router.back()} style={s.circle}><Ionicons name="arrow-back" size={20} color={theme.color.text}/></PressableScale><Text style={s.topTitle}>Sell on Vendo</Text><View style={{width:42}}/></View>
  <View style={s.hero}><Image source={{uri:item.photo}} style={s.photo} contentFit="cover"/><View style={s.heroInfo}><Text style={s.eyebrow}>AI READY</Text><Text style={s.heroTitle} numberOfLines={2}>{item.name}</Text><Text style={s.heroPrice}>Vendo estimate {formatMoney(item.market_low)}–{formatMoney(item.market_high)}</Text></View></View>
  <Text style={s.section}>Review before publishing</Text><Text style={s.sub}>Vendo filled this in for you. Edit only what needs changing.</Text>
  <Label text="Title"/><TextInput value={title} onChangeText={setTitle} style={s.input}/>
  <Label text="Description"/><TextInput value={desc} onChangeText={setDesc} style={[s.input,s.area]} multiline/>
  <View style={s.two}><View style={{flex:1}}><Label text="Price"/><TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={s.input}/></View><View style={{flex:1}}><Label text="Condition"/><TextInput value={condition} onChangeText={setCondition} style={s.input}/></View></View>
  <Label text="Category"/><TextInput value={category} onChangeText={setCategory} style={s.input}/>
  <Label text="Approximate location"/><TextInput value={location} onChangeText={setLocation} placeholder="City / area" placeholderTextColor={theme.color.textFaint} style={s.input}/>
  {!!error&&<Text style={s.err}>{error}</Text>}
  <SellingCoach input={{title,description:desc,price:Number(price)||item.listing.price,category,photo_count:(item.photos?.length||1),value_low:item.market_low,value_high:item.market_high}}/>
  <View style={s.notice}><Ionicons name="shield-checkmark-outline" size={18} color={theme.color.lime}/><Text style={s.noticeTxt}>Your asking price is shown separately from Vendo's AI estimate. You can unpublish or mark the item sold at any time.</Text></View>
  <PressableScale onPress={publish} disabled={busy} hapticStyle="heavy" style={s.publish}><Ionicons name="storefront" size={19} color={theme.color.onLime}/><Text style={s.publishTxt}>{busy?'Publishing…':'Publish on Vendo'}</Text></PressableScale>
 </ScrollView></KeyboardAvoidingView></SafeAreaView>
}
function Label({text}:{text:string}){return <Text style={s.label}>{text}</Text>}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:theme.color.bg},wrap:{padding:20,paddingBottom:60},loading:{color:theme.color.text,padding:24},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:20},circle:{width:42,height:42,borderRadius:21,backgroundColor:theme.color.surface,borderWidth:1,borderColor:theme.color.border,alignItems:'center',justifyContent:'center'},topTitle:{color:theme.color.text,fontFamily:theme.font.displayBold,fontSize:18},hero:{height:190,borderRadius:24,overflow:'hidden',backgroundColor:theme.color.surface,position:'relative'},photo:{width:'100%',height:'100%'},heroInfo:{position:'absolute',left:0,right:0,bottom:0,padding:18,backgroundColor:'rgba(0,0,0,.62)'},eyebrow:{color:theme.color.lime,fontFamily:theme.font.textBold,fontSize:10,letterSpacing:1.5},heroTitle:{color:'#fff',fontFamily:theme.font.displayBold,fontSize:22,marginTop:3},heroPrice:{color:'rgba(255,255,255,.72)',fontFamily:theme.font.text,fontSize:12,marginTop:4},section:{color:theme.color.text,fontFamily:theme.font.displayBold,fontSize:24,marginTop:24},sub:{color:theme.color.textMuted,fontFamily:theme.font.text,fontSize:13,lineHeight:19,marginTop:5,marginBottom:10},label:{color:theme.color.textMuted,fontFamily:theme.font.textBold,fontSize:10,letterSpacing:1.2,textTransform:'uppercase',marginTop:14,marginBottom:6},input:{minHeight:52,borderRadius:15,backgroundColor:theme.color.surface,borderWidth:1,borderColor:theme.color.border,color:theme.color.text,fontFamily:theme.font.text,fontSize:14,paddingHorizontal:14,paddingVertical:12},area:{height:130,textAlignVertical:'top'},two:{flexDirection:'row',gap:10},err:{color:theme.color.error,fontSize:13,marginTop:12},notice:{marginTop:18,borderRadius:16,backgroundColor:theme.color.limeSoft,borderWidth:1,borderColor:'rgba(212,255,63,.2)',padding:14,flexDirection:'row',gap:10},noticeTxt:{flex:1,color:theme.color.textMuted,fontFamily:theme.font.text,fontSize:12,lineHeight:18},publish:{height:60,borderRadius:18,backgroundColor:theme.color.lime,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9,marginTop:18},publishTxt:{color:theme.color.onLime,fontFamily:theme.font.textBold,fontSize:16}})
