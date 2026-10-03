import { googleApi } from './firebase-client.mjs';
import { writeFile } from 'node:fs/promises';
const project='muanoluxe',number='188217994921',appId='1:188217994921:web:5b37a28b45874382d003b8';
const base=`https://firestore.googleapis.com/v1/projects/${project}/databases`;
const databases=await googleApi(base);
if(!databases.databases?.some(d=>d.name.endsWith('/(default)'))){const d=await googleApi(base+'?databaseId=(default)','POST',{type:'FIRESTORE_NATIVE',locationId:'europe-west1',deleteProtectionState:'DELETE_PROTECTION_ENABLED'});console.log('Firestore creation requested:',d.name);}else console.log('Existing Firestore database preserved.');
const keys=await googleApi(`https://recaptchaenterprise.googleapis.com/v1/projects/${project}/keys`);
let key=keys.keys?.find(k=>k.displayName==='MuanoLuxe storefront App Check');
if(!key)key=await googleApi(`https://recaptchaenterprise.googleapis.com/v1/projects/${project}/keys`,'POST',{displayName:'MuanoLuxe storefront App Check',webSettings:{allowedDomains:['muanoluxe.web.app','muanoluxe.firebaseapp.com'],integrationType:'SCORE',allowAllDomains:false}});
const siteKey=key.name.split('/').at(-1);
await googleApi(`https://firebaseappcheck.googleapis.com/v1/projects/${number}/apps/${appId}/recaptchaEnterpriseConfig?updateMask=siteKey,tokenTtl`,'PATCH',{name:`projects/${number}/apps/${appId}/recaptchaEnterpriseConfig`,siteKey,tokenTtl:'3600s'});
await writeFile('.env.production',`VITE_FIREBASE_ENABLED=true\nVITE_RECAPTCHA_ENTERPRISE_SITE_KEY=${siteKey}\nVITE_FUNCTIONS_REGION=europe-west1\n`);
console.log('App Check registered for the production hosting domains.');
const lookup=await googleApi(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`,'POST',{email:['muanoluxe@gmail.com']});
let user=lookup.users?.[0];
if(!user){const created=await googleApi(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts`,'POST',{email:'muanoluxe@gmail.com',displayName:'MuanoLuxe Studio'});user={localId:created.localId};console.log('Reserved administrator account created.');}
await googleApi(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:update`,'POST',{localId:user.localId,customAttributes:JSON.stringify({...JSON.parse(user.customAttributes||'{}'),admin:true})});
console.log('Administrator role granted to muanoluxe@gmail.com. Sign in with Google to verify account ownership.');
