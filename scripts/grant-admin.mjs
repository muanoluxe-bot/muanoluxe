import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const uid=process.argv[2];
if(!uid){console.error('Usage: npm run admin:grant -- FIREBASE_USER_UID\nUse an authorized application-default credential or GOOGLE_APPLICATION_CREDENTIALS.');process.exit(1);}
initializeApp({credential:applicationDefault(),projectId:'muanoluxe'});
const user=await getAuth().getUser(uid);
await getAuth().setCustomUserClaims(uid,{...user.customClaims,admin:true});
console.log('Administrator access granted. Sign out and sign in again to refresh the token.');
