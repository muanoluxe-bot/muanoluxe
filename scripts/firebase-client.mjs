import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const auth=require('../node_modules/firebase-tools/lib/auth.js');
export async function googleApi(url,method='GET',body){const account=auth.getGlobalDefaultAccount();if(!account)throw new Error('Run firebase login first.');const token=await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase','https://www.googleapis.com/auth/userinfo.email']);const r=await fetch(url,{method,headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const responseText=await r.text();const data=responseText?JSON.parse(responseText):{};if(!r.ok){const e=new Error(`${r.status}: ${data.error?.message||'Google API request failed'}`);e.status=r.status;throw e;}return data;}

