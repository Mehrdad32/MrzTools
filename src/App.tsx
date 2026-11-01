import {useEffect,useMemo,useRef,useState} from 'react'
import {
 allCountryOptions,checkDigit,countryInfo,DEFAULT_GENERATOR,generateMRZ,
 parseMRZ,persianDate,SAMPLES,
 type Format,type GeneratorInput,type ParsedMRZ,
} from './core/mrz'

type Tab='parse'|'generate'|'lab'
const FORMATS:Format[]=['TD3','TD2','TD1']
function Icon({name}:{name:'shield'|'upload'|'copy'|'download'|'arrow'|'check'|'alert'|'reset'|'photo'|'globe'}){
 const paths={
  shield:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4',
  upload:'M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4',
  copy:'M8 4H6a2 2 0 0 0-2 2v12h2M10 8h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z',
  download:'M12 3v12m-5-5 5 5 5-5M4 18v3h16v-3',
  arrow:'M19 12H5m7-7-7 7 7 7',
  check:'M5 12l4 4L19 6',
  alert:'M12 3 2 21h20L12 3ZM12 9v5m0 4h.01',
  reset:'M3 11a9 9 0 1 1 2.5 6M3 4v7h7',
  photo:'M4 5h16v14H4zM8 10a2 2 0 1 0 0-.01M5 18l6-6 3 3 2-2 3 5',
  globe:'M12 2a10 10 0 1 0 .01 0ZM2 12h20M12 2c-7 5-7 15 0 20m0-20c7 5 7 15 0 20',
 }
 return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>
}
function dateDetails(iso:string|null){
 return iso ? <span className="date-both" dir="ltr">{iso} <span className="shamsi">({persianDate(iso)})</span></span> : <span>—</span>
}
function Flag({code}:{code:string}){const c=countryInfo(code);return <span className="flag-line"><span className="flag">{c.flag}</span><span>{c.name}</span><code dir="ltr">{code}</code></span>}
function MRZText({text}:{text:string}){
 return <div className="mrz-box" dir="ltr" aria-label="Machine readable zone">{text.split('\n').map((line,i)=><div className="mrz-line" key={i}>{line}</div>)}</div>
}
function Info({title,children,mono=false}:{title:string,children:React.ReactNode,mono?:boolean}){
 return <div className="info-item"><span>{title}</span><strong className={mono?'mono':''}>{children}</strong></div>
}
function Result({data,onCopy}:{data:ParsedMRZ,onCopy:(s:string)=>void}){
 const passed=data.checks.filter(c=>c.valid).length
 return <div className="result-contents">
  <div className="result-head">
    <span className={'valid-indicator '+(data.valid?'ok':'bad')}><Icon name={data.valid?'check':'alert'}/>{data.valid?'ساختار و Check Digitها سازگارند':'ناهماهنگی در اعتبارسنجی'}</span>
    <span className="result-format" dir="ltr">{data.format} / ICAO 9303</span>
  </div>
  <div className="stats"><div><small>نوع سند</small><b>{data.kind.startsWith('P')?'گذرنامه':'کارت / سند مسافرتی'}</b></div><div><small>Check Digit</small><b dir="ltr">{passed} / {data.checks.length}</b></div><div><small>سطرها</small><b>{data.lines.length.toLocaleString('fa-IR')}</b></div></div>
  <div className="section-heading">مشخصات استخراج‌شده <span>PARSED DATA</span></div>
  <div className="info-grid">
    <Info title="نام خانوادگی" mono>{data.surname}</Info>
    <Info title="نام" mono>{data.givenNames}</Info>
    <Info title="شماره سند" mono>{data.documentNumber}</Info>
    <Info title="جنسیت">{data.gender}</Info>
    <Info title="کشور صادرکننده"><Flag code={data.issuer}/></Info>
    <Info title="تابعیت"><Flag code={data.nationality}/></Info>
    <Info title="تاریخ تولد میلادی (شمسی)">{dateDetails(data.birthISO)}</Info>
    <Info title="تاریخ انقضا میلادی (شمسی)">{dateDetails(data.expiryISO)}</Info>
    <Info title="Optional Data" mono>{data.optional||'—'}</Info>
  </div>
  <div className="section-heading">بررسی رقم‌های کنترل <span>CHECK DIGITS</span></div>
  <div className="checks">
    {data.checks.map(c=><div className="check-row" key={c.label}><span className={'check-dot '+(c.valid?'ok':'bad')}>{c.valid?'✓':'!'}</span><span className="check-label">{c.label}</span><code dir="ltr">{c.actual} / {c.expected}</code><span className={c.valid?'good':'badtext'}>{c.valid?'درست':'خطا'}</span></div>)}
  </div>
  {data.warnings.map((warning,i)=><div className="warning" key={i}><Icon name="alert"/><span>{warning}</span></div>)}
  <div className="section-heading">داده خام <span>RAW MRZ</span></div>
  <MRZText text={data.lines.join('\n')}/>
  <div className="actions"><button type="button" className="secondary-button" onClick={()=>onCopy(data.lines.join('\n'))}><Icon name="copy"/> کپی MRZ</button><button type="button" className="secondary-button" onClick={()=>downloadData(JSON.stringify(data,null,2),'MRZ-Parsed.json','application/json')}><Icon name="download"/> دانلود JSON</button></div>
 </div>
}
function downloadData(content:string,name:string,type:string){
 const url=URL.createObjectURL(new Blob([content],{type}))
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove()
 window.setTimeout(()=>URL.revokeObjectURL(url),2000)
}

async function exportSampleCard(data:ParsedMRZ,photo:string|null){
  const canvas=document.createElement('canvas')
  canvas.width=1200; canvas.height=760
  const ctx=canvas.getContext('2d')
  if(!ctx)throw new Error('مرورگر از Canvas پشتیبانی نمی‌کند.')
  const grad=ctx.createLinearGradient(0,0,1200,760)
  grad.addColorStop(0,'#163a31');grad.addColorStop(.55,'#0c2420');grad.addColorStop(1,'#081411')
  ctx.fillStyle=grad;ctx.fillRect(0,0,1200,760)
  ctx.strokeStyle='rgba(167,243,208,.4)';ctx.lineWidth=3;ctx.strokeRect(24,24,1152,712)
  ctx.font='bold 37px sans-serif';ctx.fillStyle='#d1fae5';ctx.fillText('MRZ TOOLS / LABORATORY',56,91)
  ctx.font='17px monospace';ctx.fillStyle='#8bb9a8';ctx.fillText('SYNTHETIC TRAINING PREVIEW - NOT A GOVERNMENT DOCUMENT',56,130)
  ctx.strokeStyle='rgba(167,243,208,.22)';ctx.beginPath();ctx.moveTo(56,154);ctx.lineTo(1144,154);ctx.stroke()
  ctx.fillStyle='#1b453b';ctx.fillRect(56,186,245,278)
  if(photo){
    const img=new Image();img.src=photo
    try{
      await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('عکس خوانده نشد.'))})
      const scale=Math.max(245/img.width,278/img.height)
      const sw=245/scale,sh=278/scale
      ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,56,186,245,278)
    }catch{ /* no photo: export the clean placeholder */ }
  }
  ctx.fillStyle='rgba(70,10,12,.8)';ctx.fillRect(56,424,245,40)
  ctx.textAlign='center';ctx.font='bold 22px sans-serif';ctx.fillStyle='#fecaca';ctx.fillText('NOT AN ID',179,452);ctx.textAlign='left'
  ctx.fillStyle='#95c6b5';ctx.font='17px monospace';ctx.fillText('HOLDER / DISPLAY NAME',330,216)
  ctx.fillStyle='#effff7';ctx.font='bold 34px sans-serif';ctx.fillText((data.givenNames+' '+data.surname).slice(0,50),330,260,815)
  const info=[['DOCUMENT NO.',data.documentNumber],['NATIONALITY',data.nationality],['DATE OF BIRTH',data.birthISO||'-'],['DATE OF EXPIRY',data.expiryISO||'-']]
  info.forEach(([label,value],i)=>{
    const col=i%2,row=Math.floor(i/2)
    const x=330+col*385,y=334+row*93
    ctx.font='15px monospace';ctx.fillStyle='#8bb7a8';ctx.fillText(label,x,y)
    ctx.font='bold 24px monospace';ctx.fillStyle='#effff7';ctx.fillText(value,x,y+34)
  })
  ctx.strokeStyle='rgba(167,243,208,.18)';ctx.beginPath();ctx.moveTo(56,495);ctx.lineTo(1144,495);ctx.stroke()
  try{await document.fonts.load('25px "MRZ OCR-B"')}catch{ /* use fallback */ }
  ctx.font='25px "MRZ OCR-B",monospace';ctx.fillStyle='#c5ffe4'
  data.lines.forEach((line,i)=>ctx.fillText(line,58,548+i*39,1082))
  ctx.save();ctx.translate(575,358);ctx.rotate(-Math.PI/12);ctx.textAlign='center'
  ctx.font='bold 79px sans-serif';ctx.fillStyle='rgba(253,164,175,.23)'
  ctx.fillText('SAMPLE · NOT VALID',0,0);ctx.restore()
  ctx.font='bold 16px monospace';ctx.fillStyle='#a7f3d0'
  ctx.fillText('FORMAT CHECKED BY MEHRDAD32 MRZ TOOLS',56,706)
  ctx.textAlign='right';ctx.fillStyle='#fda4af';ctx.fillText('NOT PROOF OF IDENTITY',1143,706)
  await new Promise<void>((resolve,reject)=>canvas.toBlob(blob=>{
    if(!blob){reject(new Error('ساخت فایل PNG ممکن نشد.'));return}
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a');a.href=url;a.download='MRZ-Tools-SAMPLE.png'
    document.body.appendChild(a);a.click();a.remove()
    window.setTimeout(()=>URL.revokeObjectURL(url),2500);resolve()
  },'image/png'))
}

function Field({title,children,detail}:{title:string,children:React.ReactNode,detail?:string}){
 return <label className="form-field"><span>{title}</span>{children}{detail&&<small>{detail}</small>}</label>
}
function DemoCard({data,photo}:{data:ParsedMRZ,photo:string|null}){
 const issuing=countryInfo(data.issuer)
 return <div className="demo-card" id="demo-card">
  <div className="demo-watermark" aria-hidden="true">SAMPLE · NOT VALID</div>
  <div className="demo-top"><span className="demo-emblem">M<span>◆</span></span><span className="demo-title">MRZ TOOLS <small>SIMULATION / TRAINING ONLY</small></span><span className="demo-chip">LAB<br/>DEMO</span></div>
  <div className="demo-body">
    <div className="demo-photo">{photo?<img src={photo} alt="تصویر انتخاب‌شده برای نمونه آموزشی"/>:<div className="photo-placeholder"><Icon name="photo"/><small>YOUR PHOTO</small></div>}<span>NOT AN ID</span></div>
    <div className="demo-info">
      <div className="demo-label">NAME / DISPLAY DATA</div><div className="demo-name">{data.givenNames} {data.surname}</div>
      <div className="demo-columns"><div><small>DOCUMENT</small><strong>{data.documentNumber}</strong></div><div><small>NATIONALITY</small><strong>{issuing.flag} {data.nationality}</strong></div></div>
      <div className="demo-columns"><div><small>BIRTH (ISO)</small><strong>{data.birthISO||'—'}</strong></div><div><small>EXPIRY (ISO)</small><strong>{data.expiryISO||'—'}</strong></div></div>
    </div>
  </div>
  <div className="demo-stamp" aria-label="Format checked by Mehrdad32 MRZ Tools">FORMAT CHECKED <b>Mehrdad32</b> MRZ TOOLS</div>
  <div className="demo-code"><MRZText text={data.lines.join('\n')}/></div>
  <div className="demo-bottom">SYNTHETIC SAMPLE · NOT ISSUED BY ANY GOVERNMENT · NOT PROOF OF IDENTITY</div>
 </div>
}
export default function App(){
 const [tab,setTab]=useState<Tab>('parse')
 const [raw,setRaw]=useState(SAMPLES.TD3)
 const [parsed,setParsed]=useState<ParsedMRZ|null>(null)
 const [generator,setGenerator]=useState<GeneratorInput>({...DEFAULT_GENERATOR})
 const [generated,setGenerated]=useState('')
 const [generatedParsed,setGeneratedParsed]=useState<ParsedMRZ|null>(null)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [checksumInput,setChecksumInput]=useState('L898902C3')
 const [photo,setPhoto]=useState<string|null>(null)
 const photoRef=useRef<HTMLInputElement>(null)
 const countries=useMemo(()=>allCountryOptions(),[])
 useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo)},[photo])
 const sampleInput=useMemo(()=>{try{return parseMRZ(raw)}catch{return null}},[raw])
 const change=(key:keyof GeneratorInput,value:string)=>{setGenerator(prev=>({...prev,[key]:value}));setGenerated('');setGeneratedParsed(null);setError('')}
 const copy=async(content:string)=>{try{await navigator.clipboard.writeText(content);setNotice('کپی شد.')}catch{setError('کپی در این مرورگر ممکن نیست. متن را دستی انتخاب کنید.')}}
 function doParse(){
  setError('');setNotice('')
  try {setParsed(parseMRZ(raw))}catch(e){setParsed(null);setError(e instanceof Error?e.message:'خطا در تحلیل MRZ')}
 }
 function doGenerate(){
  setError('');setNotice('')
  try{
   const mrz=generateMRZ(generator)
   const result=parseMRZ(mrz)
   setGenerated(mrz);setGeneratedParsed(result)
   setNotice('MRZ آزمایشی با Check Digitهای سازگار تولید شد.')
  }catch(e){setGenerated('');setGeneratedParsed(null);setError(e instanceof Error?e.message:'خطا در تولید MRZ')}
 }
 function selectPhoto(file:File|undefined){
  if(!file)return
  if(!file.type.startsWith('image/')||file.size>5*1024*1024){setError('تصویر باید JPEG/PNG/WebP و حداکثر ۵ مگابایت باشد.');return}
  setError('');setPhoto(URL.createObjectURL(file))
  if(photoRef.current)photoRef.current.value=''
 }
 const countrySelect=(key:'issuer'|'nationality')=><select dir="ltr" value={generator[key]} onChange={e=>change(key,e.target.value)}>
  <option value="UTO">🌐 UTO — Fictional sample</option>{countries.map(c=><option value={c.code} key={c.code}>{c.flag} {c.code} — {c.name}</option>)}
 </select>
 return <main className="app-shell">
  <div className="grid-background" aria-hidden="true"/><div className="ambient emerald" aria-hidden="true"/><div className="ambient blue" aria-hidden="true"/>
  <header className="topbar"><div className="brand"><div className="brand-symbol">M<span>‹</span></div><div><strong>MRZ Tools</strong><small>MEHRDAD32 LABORATORY</small></div></div><div className="top-actions"><span className="offline"><i/> LOCAL / PRIVATE <span>·</span> V1 ALPHA</span><a href="https://github.com/Mehrdad32/MrzTools" target="_blank" rel="noreferrer">GITHUB ↗</a></div></header>
  <section className="hero"><div className="eyebrow">MACHINE READABLE ZONE <span>—</span> ICAO 9303</div><h1>دنیای MRZ، <em>زیر ذره‌بین.</em></h1><p>خواندن، تحلیل و ساخت داده‌های آزمایشی MRZ برای گذرنامه و کارت‌های مسافرتی؛ با اعتبارسنجی Check Digit، نمایش پرچم کشورها و تبدیل تاریخ میلادی به شمسی. همه‌چیز روی دستگاه خودت انجام می‌شود.</p></section>
  <nav className="tabbar" aria-label="ابزارهای MRZ">
   <button className={tab==='parse'?'selected':''} onClick={()=>{setTab('parse');setError('');setNotice('')}} type="button"><span>01</span> خواندن و تحلیل</button>
   <button className={tab==='generate'?'selected':''} onClick={()=>{setTab('generate');setError('');setNotice('')}} type="button"><span>02</span> تولید MRZ</button>
   <button className={tab==='lab'?'selected':''} onClick={()=>{setTab('lab');setError('');setNotice('')}} type="button"><span>03</span> آزمایشگاه</button>
  </nav>
  {error&&<div className="alert error" role="alert"><Icon name="alert"/>{error}</div>}
  {notice&&<div className="alert success" role="status"><Icon name="check"/>{notice}</div>}
  {tab==='parse'&&<section className="workspace">
    <div className="panel"><div className="panel-heading"><div><small>STEP 01 / INPUT</small><h2>MRZ را وارد کنید</h2></div><span className="panel-code">TD1 / TD2 / TD3</span></div>
      <label className="form-label" htmlFor="raw-mrz">MRZ خام دو یا سه‌سطری</label>
      <textarea id="raw-mrz" className="raw-textarea mrz-font" dir="ltr" value={raw} spellCheck={false} onChange={e=>{setRaw(e.target.value);setParsed(null)}}/>
      <div className="format-choices">{FORMATS.map(format=><button type="button" className="format-button" key={format} onClick={()=>{setRaw(SAMPLES[format]);setParsed(null)}}>{format}<small>{format==='TD1'?'3 × 30':format==='TD2'?'2 × 36':'2 × 44'}</small></button>)}</div>
      <p className="hint">نمونه‌های تست استاندارد داخل دکمه‌های بالا آماده‌اند. با Paste داده، پردازش محلی انجام می‌شود.</p>
      <button type="button" className="primary-button" onClick={doParse}>تحلیل و اعتبارسنجی MRZ <Icon name="arrow"/></button>
      {sampleInput&&<p className="preview-hint">ساختار شناسایی شد: <b dir="ltr">{sampleInput.format}</b> · برای نمایش جزئیات دکمه تحلیل را بزنید.</p>}
      <div className="security-note"><Icon name="shield"/><span>اطلاعات حساس را فقط با مجوز و در محیط امن پردازش کنید. داده‌ها به سرور ارسال نمی‌شوند.</span></div>
    </div>
    <div className="panel result-panel"><div className="panel-heading"><div><small>STEP 02 / RESULT</small><h2>نتیجه پردازش</h2></div><span className="panel-code green">VALIDATION</span></div>{parsed?<Result data={parsed} onCopy={s=>void copy(s)}/>:<div className="empty-view"><div className="empty-icon"><Icon name="shield"/></div><strong>آماده تحلیل اطلاعات</strong><p>پس از وارد کردن MRZ، مشخصات، تاریخ شمسی و رقم‌های کنترل اینجا نمایش داده می‌شوند.</p><small>LOCAL PARSER / NO UPLOAD</small></div>}</div>
  </section>}
  {tab==='generate'&&<section className="workspace">
    <div className="panel"><div className="panel-heading"><div><small>STEP 01 / SYNTHETIC DATA</small><h2>تولید MRZ آزمایشی</h2></div><span className="panel-code">GENERATOR</span></div>
      <div className="form-grid">
        <Field title="فرمت سند"><select value={generator.format} onChange={e=>change('format',e.target.value)}>{FORMATS.map(f=><option key={f} value={f}>{f} — {f==='TD1'?'سه سطری / کارت':f==='TD2'?'دو سطری / کارت':'دو سطری / گذرنامه'}</option>)}</select></Field>
        <Field title="نام خانوادگی (Latin)"><input dir="ltr" value={generator.surname} onChange={e=>change('surname',e.target.value)} maxLength={50}/></Field>
        <Field title="نام (Latin)"><input dir="ltr" value={generator.givenNames} onChange={e=>change('givenNames',e.target.value)} maxLength={50}/></Field>
        <Field title="شماره آزمایشی سند"><input dir="ltr" value={generator.documentNumber} onChange={e=>change('documentNumber',e.target.value)} maxLength={9}/></Field>
        <Field title="کشور صادرکننده">{countrySelect('issuer')}</Field>
        <Field title="تابعیت">{countrySelect('nationality')}</Field>
        <Field title="تولد (میلادی)"><input type="date" dir="ltr" value={generator.birthDate} onChange={e=>change('birthDate',e.target.value)}/></Field>
        <Field title="انقضا (میلادی)"><input type="date" dir="ltr" value={generator.expiryDate} onChange={e=>change('expiryDate',e.target.value)}/></Field>
        <Field title="جنسیت"><select value={generator.sex} onChange={e=>change('sex',e.target.value)}><option value="M">M</option><option value="F">F</option><option value="<">نامشخص</option></select></Field>
        <Field title="Optional Data"><input value={generator.optional} dir="ltr" onChange={e=>change('optional',e.target.value)} maxLength={26}/></Field>
      </div>
      <button type="button" className="primary-button" onClick={doGenerate}>ساخت کد با Check Digit صحیح <Icon name="arrow"/></button>
      <p className="hint">نام‌ها در این بخش صرفاً با حروف A–Z وارد می‌شوند؛ حروف غیرلاتین نیاز به آوانویسی دارند.</p>
      <div className="security-note"><Icon name="shield"/><span>صرفاً نمونه و تست نرم‌افزار؛ این ابزار سند رسمی، مجوز سفر یا مدرک هویتی ایجاد نمی‌کند.</span></div>
    </div>
    <div className="panel result-panel"><div className="panel-heading"><div><small>STEP 02 / PREVIEW</small><h2>نتیجه تولید</h2></div><span className="panel-code green">OCR-B / FORMAT</span></div>
     {generated&&generatedParsed?<div className="generated">
       <div className="section-heading">خروجی MRZ <span>{generator.format} / VALID CHECK DIGITS</span></div>
       <MRZText text={generated}/>
       <div className="actions"><button className="secondary-button" onClick={()=>void copy(generated)}><Icon name="copy"/> کپی MRZ</button><button className="secondary-button" onClick={()=>downloadData(generated,'MRZ-SAMPLE.txt','text/plain')}><Icon name="download"/> دانلود TXT</button><button className="secondary-button" onClick={()=>{setRaw(generated);setParsed(parseMRZ(generated));setTab('parse')}}><Icon name="arrow"/> تست در پارسر</button></div>
       <div className="section-heading">کارت آموزشی <span>VISUAL SIMULATOR</span></div>
       <div className="photo-controls"><input type="file" ref={photoRef} accept="image/png,image/jpeg,image/webp" onChange={e=>selectPhoto(e.target.files?.[0])} className="hidden-input"/><button className="secondary-button" type="button" onClick={()=>photoRef.current?.click()}><Icon name="photo"/> افزودن عکس محلی</button>{photo&&<button className="minor-button" onClick={()=>setPhoto(null)}>حذف عکس</button>}</div>
       <DemoCard data={generatedParsed} photo={photo}/>
       <div className="actions"><button type="button" className="secondary-button" onClick={()=>void exportSampleCard(generatedParsed,photo).catch(e=>setError(e instanceof Error?e.message:'خروجی PNG ساخته نشد.'))}><Icon name="download"/> دانلود کارت آزمایشی PNG</button></div>
       <p className="hint">پیش‌نمایش با واترمارک دائمی SAMPLE و هویت بصری اختصاصی؛ فاقد نشان یا قالب رسمی دولت‌ها است.</p>
     </div>:<div className="empty-view"><div className="empty-icon"><Icon name="upload"/></div><strong>استودیوی ساخت MRZ</strong><p>فرم سمت راست را کامل کن تا MRZ و کارت آزمایشگاهی با فونت OCR-B ساخته شوند.</p><small>DESIGN / TRAINING / SIMULATION</small></div>}
    </div>
  </section>}
  {tab==='lab'&&<section className="workspace">
   <div className="panel"><div className="panel-heading"><div><small>CHECK DIGIT LAB</small><h2>محاسبه رقم کنترل</h2></div><span className="panel-code">7 / 3 / 1</span></div>
     <label className="form-label" htmlFor="check-input">رشته با کاراکترهای استاندارد MRZ</label>
     <textarea id="check-input" className="lab-input" dir="ltr" spellCheck={false} value={checksumInput} onChange={e=>setChecksumInput(e.target.value.toUpperCase())}/>
     <div className="check-big"><span>رقم کنترل محاسبه‌شده</span><strong>{/^[A-Z0-9<]*$/.test(checksumInput)?checkDigit(checksumInput):'—'}</strong></div>
     <p className="hint">وزن‌های ۷، ۳ و ۱ به‌صورت چرخه‌ای تکرار می‌شوند. نتیجه حاصل جمع وزنی به پیمانه ۱۰ است. کاراکتر &lt; برابر صفر محسوب می‌شود.</p>
   </div>
   <div className="panel"><div className="panel-heading"><div><small>MRZ REFERENCE</small><h2>راهنمای فنی</h2></div><span className="panel-code green">ICAO DOC 9303</span></div>
     <div className="lab-table"><div><b>TD1</b><span>کارت‌های مسافرتی؛ ۳ خط × ۳۰ کاراکتر</span></div><div><b>TD2</b><span>سند مسافرتی؛ ۲ خط × ۳۶ کاراکتر</span></div><div><b>TD3</b><span>گذرنامه؛ ۲ خط × ۴۴ کاراکتر</span></div><div><b>MRZ alphabet</b><span>حروف A–Z، ارقام 0–9، علامت &lt;</span></div><div><b>Birth / Expiry</b><span>YYMMDD — قرن سال به‌صورت قطعی در MRZ ذخیره نمی‌شود</span></div><div><b>Check Digit</b><span>فقط یک کنترل حسابی است، نه اثبات اصالت سند</span></div></div>
     <div className="section-heading">ایده‌های توسعه بعدی <span>ROADMAP</span></div>
     <p className="hint">تشخیص خطاهای OCR مثل O/0 و I/1، تست تطبیق ساختار MRZ با داده‌های NFC DG1، پشتیبانی از MRV-A/MRV-B، کنترل دقیق‌تر استانداردهای محلی، و ساخت کیس‌های تست خودکار.</p>
   </div>
  </section>}
  <div className="trust-grid"><div><Icon name="shield"/><span><b>بدون آپلود</b><small>پردازش کامل در مرورگر</small></span></div><div><Icon name="globe"/><span><b>کشورها و پرچم‌ها</b><small>کدهای ISO و ترجمه فارسی</small></span></div><div><Icon name="check"/><span><b>Check Digit</b><small>اعتبارسنجی استاندارد 7-3-1</small></span></div></div>
  <div className="disclaimer"><Icon name="alert"/><span>نتیجه بررسی Check Digit یا نشان «Format checked» فقط به ساختار MRZ اشاره دارد و هیچ اصالت‌سنجی، تأیید هویت، صحت مدرک فیزیکی یا ارزیابی پایگاه‌های رسمی انجام نمی‌دهد. کارت پیش‌نمایش فقط نمونه آموزشی است.</span></div>
  <footer className="footer"><span>MRZ Tools · ساخته‌شده توسط <a href="https://mehrdad32.ir/" target="_blank" rel="noreferrer">Mehrdad32</a></span><div><a href="https://github.com/Mehrdad32/MrzTools" target="_blank" rel="noreferrer">GITHUB / SOURCE</a><span>·</span><a href="https://tarikhdaar.mehrdad32.ir/" target="_blank" rel="noreferrer">تاریخ‌دار</a></div></footer>
 </main>
}
