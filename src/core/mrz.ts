import countries from 'i18n-iso-countries'

export type Format = 'TD1' | 'TD2' | 'TD3'
export type FieldCheck = { label: string; data: string; expected: string; actual: string; valid: boolean }
export type ParsedMRZ = {
  format: Format
  lines: string[]
  kind: string
  issuer: string
  nationality: string
  surname: string
  givenNames: string
  documentNumber: string
  birthRaw: string
  expiryRaw: string
  birthISO: string | null
  expiryISO: string | null
  gender: string
  optional: string
  checks: FieldCheck[]
  warnings: string[]
  valid: boolean
}
export type GeneratorInput = {
  format: Format
  surname: string
  givenNames: string
  documentNumber: string
  issuer: string
  nationality: string
  birthDate: string
  expiryDate: string
  sex: 'M'|'F'|'<'
  optional: string
}

export const SAMPLES: Record<Format,string> = {
  TD1: 'I<UTOD231458907<<<<<<<<<<<<<<<\n7408122F1204159UTO<<<<<<<<<<<6\nERIKSSON<<ANNA<MARIA<<<<<<<<<<',
  TD2: 'I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<\nD231458907UTO7408122F1204159<<<<<<<6',
  TD3: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10',
}

export function normalizeMRZ(text:string) {
  return text.toUpperCase().replace(/[\u200c\u200d\r]/g,'').trim()
    .split('\n').map(line => line.replace(/\s/g,'')).filter(Boolean)
}
const lengths:Record<Format,[number,number]> = {TD1:[3,30],TD2:[2,36],TD3:[2,44]}
export function detectFormat(lines:string[]): Format | null {
  if(lines.length===3 && lines.every(x=>x.length===30))return 'TD1'
  if(lines.length===2 && lines.every(x=>x.length===36))return 'TD2'
  if(lines.length===2 && lines.every(x=>x.length===44))return 'TD3'
  return null
}
export function checkDigit(input:string) {
  const weights=[7,3,1]
  let sum=0
  for(let i=0;i<input.length;i++){
    const c=input.charCodeAt(i)
    let value:number
    if(c>=48 && c<=57)value=c-48
    else if(c>=65 && c<=90)value=c-55
    else if(c===60)value=0
    else throw new Error('کاراکتر خارج از مجموعه استاندارد MRZ در ورودی Check Digit وجود دارد.')
    sum+=value*weights[i%3]
  }
  return String(sum%10)
}
export function checkField(label:string,data:string,actual:string):FieldCheck{
  const expected=checkDigit(data)
  return {label,data,actual,expected,valid:expected===actual}
}
export function parseName(input:string) {
  const [surname='',...given]=input.replace(/<+$/,'').split('<<')
  return {surname:surname.replace(/<+/g,' ').trim(),givenNames:given.join(' ').replace(/<+/g,' ').trim()}
}
export function validISODate(iso:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return false
  const [y,m,d]=iso.split('-').map(Number)
  const v=new Date(Date.UTC(y,m-1,d))
  return v.getUTCFullYear()===y && v.getUTCMonth()===m-1 && v.getUTCDate()===d
}
export function resolveYYMMDD(raw:string,kind:'birth'|'expiry',now=new Date()):string|null{
  if(!/^\d{6}$/.test(raw))return null
  const y=Number(raw.slice(0,2)),mm=raw.slice(2,4),dd=raw.slice(4,6)
  const year=now.getUTCFullYear()
  const candidates=[1900+y,2000+y,2100+y].filter(v=>validISODate(String(v)+'-'+mm+'-'+dd))
  if(!candidates.length)return null
  const target=kind==='birth'?year-32:year+4
  const allowed=kind==='birth'?candidates.filter(v=>v<=year && v>=year-120):candidates.filter(v=>v>=year-25 && v<=year+25)
  const pool=allowed.length?allowed:candidates
  const resolved=pool.reduce((a,b)=>Math.abs(a-target)<=Math.abs(b-target)?a:b)
  return resolved+'-'+mm+'-'+dd
}
export function persianDate(iso:string|null):string {
  if(!iso || !validISODate(iso))return '—'
  const [y,m,d]=iso.split('-').map(Number)
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d)))
}
export function countryInfo(code:string) {
  const normalized=code.replace(/</g,'').toUpperCase()
  if(normalized==='UTO')return {code:normalized,name:'کشور خیالی نمونه (Utopia)',flag:'🌐',alpha2:''}
  const manual:Record<string,string>={D:'DE',GBD:'GB',GBN:'GB',GBO:'GB',GBP:'GB',GBS:'GB',XKX:'XK',RKS:'XK'}
  const alpha2=manual[normalized] ?? countries.alpha3ToAlpha2(normalized) ?? ''
  let name=normalized||'نامشخص'
  let flag='🌐'
  if(alpha2){
    try { name=new Intl.DisplayNames(['fa'],{type:'region'}).of(alpha2)||normalized }catch{ name=normalized }
    if(/^[A-Z]{2}$/.test(alpha2)) flag=[...alpha2].map(x=>String.fromCodePoint(x.charCodeAt(0)+127397)).join('')
  }
  return {code:normalized,name,flag,alpha2}
}
export function allCountryOptions(){
  const mapping=countries.getAlpha3Codes() as Record<string,string>
  return Object.keys(mapping).map(code=>({...countryInfo(code)}))
    .filter(c=>c.alpha2).sort((a,b)=>a.name.localeCompare(b.name,'fa'))
}
export function parseMRZ(input:string):ParsedMRZ{
  const lines=normalizeMRZ(input)
  const format=detectFormat(lines)
  if(!format){
    const sizes=lines.map(l=>l.length).join(', ')
    throw new Error('ساختار MRZ پشتیبانی نمی‌شود. TD1: سه سطر × ۳۰، TD2: دو سطر × ۳۶، TD3: دو سطر × ۴۴ کاراکتر. طول‌های فعلی: '+sizes)
  }
  if(lines.some(line=>!/^[A-Z0-9<]+$/.test(line)))throw new Error('MRZ فقط شامل A–Z، 0–9 و < است.')
  const checks:FieldCheck[]=[]
  const warnings:string[]=[]
  let name='',kind='',issuer='',nat='',number='',birth='',expiry='',sex='',optional=''
  if(format==='TD1'){
    const [a,b,c]=lines
    kind=a.slice(0,2);issuer=a.slice(2,5);name=c;number=a.slice(5,14)
    birth=b.slice(0,6);sex=b[7];expiry=b.slice(8,14);nat=b.slice(15,18)
    optional=a.slice(15,30)+b.slice(18,29)
    checks.push(checkField('شماره سند',a.slice(5,14),a[14]))
    checks.push(checkField('تاریخ تولد',birth,b[6]))
    checks.push(checkField('تاریخ انقضا',expiry,b[14]))
    checks.push(checkField('کنترل ترکیبی',a.slice(5,30)+b.slice(0,7)+b.slice(8,15)+b.slice(18,29),b[29]))
    if(a[14]==='<')warnings.push('شماره سند دارای ساختار توسعه‌یافته است؛ تفسیر شماره‌های طولانی در نسخه فعلی محدود است.')
  }else if(format==='TD2'){
    const [a,b]=lines
    kind=a.slice(0,2);issuer=a.slice(2,5);name=a.slice(5,36)
    number=b.slice(0,9);nat=b.slice(10,13);birth=b.slice(13,19);sex=b[20];expiry=b.slice(21,27)
    optional=b.slice(28,35)
    checks.push(checkField('شماره سند',number,b[9]))
    checks.push(checkField('تاریخ تولد',birth,b[19]))
    checks.push(checkField('تاریخ انقضا',expiry,b[27]))
    checks.push(checkField('کنترل ترکیبی',b.slice(0,10)+b.slice(13,20)+b.slice(21,35),b[35]))
  }else{
    const [a,b]=lines
    kind=a.slice(0,2);issuer=a.slice(2,5);name=a.slice(5,44)
    number=b.slice(0,9);nat=b.slice(10,13);birth=b.slice(13,19);sex=b[20];expiry=b.slice(21,27)
    optional=b.slice(28,42)
    checks.push(checkField('شماره سند',number,b[9]))
    checks.push(checkField('تاریخ تولد',birth,b[19]))
    checks.push(checkField('تاریخ انقضا',expiry,b[27]))
    checks.push(checkField('داده اختیاری',optional,b[42]))
    checks.push(checkField('کنترل ترکیبی',b.slice(0,10)+b.slice(13,20)+b.slice(21,43),b[43]))
  }
  const names=parseName(name)
  const birthISO=resolveYYMMDD(birth,'birth')
  const expiryISO=resolveYYMMDD(expiry,'expiry')
  if(!birthISO)warnings.push('تاریخ تولد نامعتبر یا ناقص است.')
  if(!expiryISO)warnings.push('تاریخ انقضا نامعتبر یا ناقص است.')
  if(!['M','F','<'].includes(sex))warnings.push('مقدار جنسیت در MRZ غیرمعمول است.')
  if(!countryInfo(issuer).alpha2 && issuer!=='UTO')warnings.push('کد صادرکننده در فهرست استاندارد ISO شناسایی نشد.')
  if(!countryInfo(nat).alpha2 && nat!=='UTO')warnings.push('کد تابعیت در فهرست استاندارد ISO شناسایی نشد.')
  if(!checks.every(x=>x.valid))warnings.push('یک یا چند Check Digit ناسازگار است؛ این داده نباید معتبر تلقی شود.')
  warnings.push('سال در MRZ دو رقمی است؛ قرن میلادی از روی بازه متعارف تخمین زده شده است.')
  return {format,lines,kind:kind.replace(/</g,''),issuer,nationality:nat,...names,documentNumber:number.replace(/<+$/,''),birthRaw:birth,expiryRaw:expiry,birthISO,expiryISO,gender:sex==='M'?'مرد':sex==='F'?'زن':'نامشخص',optional:optional.replace(/<+$/,''),checks,warnings,valid:checks.every(c=>c.valid) && !!birthISO && !!expiryISO}
}
export function sanitizedField(value:string,label:string,maxLength=50){
  const normalized=value.toUpperCase().trim().replace(/[\s-]+/g,'<')
  if(!normalized || !/^[A-Z0-9<]+$/.test(normalized))throw new Error(label+' باید فقط حروف لاتین A–Z، اعداد و فاصله داشته باشد.')
  if(normalized.length>maxLength)throw new Error(label+' طولانی‌تر از حد مجاز است.')
  return normalized
}
const fill=(text:string,size:number)=>text.slice(0,size).padEnd(size,'<')
const cleanName=(text:string,label:string)=>sanitizedField(text,label,55).replace(/<+/g,'<')
function mrzDate(iso:string,label:string) {
  if(!validISODate(iso))throw new Error(label+' باید تاریخ میلادی صحیح با قالب YYYY-MM-DD باشد.')
  return iso.slice(2,4)+iso.slice(5,7)+iso.slice(8,10)
}
export function generateMRZ(x:GeneratorInput):string{
  const surname=cleanName(x.surname,'نام خانوادگی')
  const given=cleanName(x.givenNames,'نام')
  const issuer=sanitizedField(x.issuer,'کشور صادرکننده',3)
  const nationality=sanitizedField(x.nationality,'تابعیت',3)
  if(issuer.length!==3||nationality.length!==3)throw new Error('کد کشور باید سه حرف باشد.')
  const documentNumber=sanitizedField(x.documentNumber,'شماره سند',9)
  const number=fill(documentNumber,9)
  const optional=x.optional.trim()?sanitizedField(x.optional,'داده اختیاری',26):''
  const dob=mrzDate(x.birthDate,'تاریخ تولد')
  const exp=mrzDate(x.expiryDate,'تاریخ انقضا')
  if(x.birthDate>=x.expiryDate)throw new Error('تاریخ انقضا باید بعد از تولد باشد.')
  const sex=x.sex
  const longName=surname+'<<'+given
  if(x.format==='TD3'){
    if(longName.length>39)throw new Error('نام برای MRZ گذرنامه بیش از حد طولانی است.')
    const a='P<'+issuer+fill(longName,39)
    const opt=fill(optional,14)
    const prefix=number+checkDigit(number)+nationality+dob+checkDigit(dob)+sex+exp+checkDigit(exp)+opt+checkDigit(opt)
    const composite=checkDigit(prefix.slice(0,10)+prefix.slice(13,20)+prefix.slice(21,43))
    return a+'\n'+prefix+composite
  }
  if(x.format==='TD2'){
    if(longName.length>31)throw new Error('نام برای TD2 بیش از حد طولانی است.')
    if(optional.length>7)throw new Error('داده اختیاری TD2 حداکثر ۷ کاراکتر است.')
    const a='I<'+issuer+fill(longName,31)
    const prefix=number+checkDigit(number)+nationality+dob+checkDigit(dob)+sex+exp+checkDigit(exp)+fill(optional,7)
    const composite=checkDigit(prefix.slice(0,10)+prefix.slice(13,20)+prefix.slice(21,35))
    return a+'\n'+prefix+composite
  }
  if(longName.length>30)throw new Error('نام برای TD1 بیش از حد طولانی است.')
  if(optional.length>15)throw new Error('داده اختیاری TD1 حداکثر ۱۵ کاراکتر است.')
  const a='I<'+issuer+number+checkDigit(number)+fill(optional,15)
  const middle=dob+checkDigit(dob)+sex+exp+checkDigit(exp)+nationality+fill('',11)
  const composite=checkDigit(a.slice(5,30)+middle.slice(0,7)+middle.slice(8,15)+middle.slice(18,29))
  return a+'\n'+middle+composite+'\n'+fill(longName,30)
}
export const DEFAULT_GENERATOR:GeneratorInput={
  format:'TD3',surname:'ERIKSSON',givenNames:'ANNA MARIA',
  documentNumber:'L898902C3',issuer:'UTO',nationality:'UTO',
  birthDate:'1974-08-12',expiryDate:'2032-04-15',sex:'F',optional:'DEMO123',
}
