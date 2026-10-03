import { readFile } from 'node:fs/promises';
const key=(await readFile('gemini API.txt','utf8')).trim();
const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:'Reply with the word ready.'}]}],generationConfig:{maxOutputTokens:256,thinkingConfig:{thinkingLevel:"LOW"}}})});
const d=await r.json();console.log(JSON.stringify({status:r.status,error:d.error?{code:d.error.code,status:d.error.status,message:String(d.error.message).replaceAll(key,'[REDACTED]')}:undefined,text:d.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')},null,2));

