import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const auth=require('../node_modules/firebase-tools/lib/auth.js');
const account=auth.getGlobalDefaultAccount();
if(!account)throw new Error('Firebase login required');
const token=await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase','https://www.googleapis.com/auth/userinfo.email']);
const endpoints={auth:'https://identitytoolkit.googleapis.com/admin/v2/projects/muanoluxe/config',billing:'https://cloudbilling.googleapis.com/v1/projects/muanoluxe/billingInfo',services:'https://serviceusage.googleapis.com/v1/projects/188217994921/services?filter=state:ENABLED&pageSize=200'};
for(const [name,url] of Object.entries(endpoints)){const r=await fetch(url,{headers:{Authorization:`Bearer ${token.access_token}`}});const d=await r.json();if(!r.ok){console.log(name, r.status, d.error?.message);continue;}if(name==='auth')console.log(JSON.stringify({auth:{authorizedDomains:d.authorizedDomains,signIn:{email:d.signIn?.email?.enabled,phone:d.signIn?.phoneNumber?.enabled}}},null,2));else if(name==='billing')console.log(JSON.stringify({billingEnabled:d.billingEnabled}));else console.log(JSON.stringify({services:d.services?.map(s=>s.config?.name)}));}

