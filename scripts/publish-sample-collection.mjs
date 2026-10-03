import { googleApi } from './firebase-client.mjs';
import { initialProducts } from '../src/catalog.js';
const base='https://firestore.googleapis.com/v1/projects/muanoluxe/databases/(default)/documents';
for(const p of initialProducts){const doc=await googleApi(`${base}/products/${p.id}`);if(doc.fields.sample?.booleanValue!==true){console.log('Preserved non-sample product:',p.id);continue;}await googleApi(`${base}/products/${p.id}?updateMask.fieldPaths=active`,'PATCH',{fields:{active:{booleanValue:true}}});console.log('Published approved preview piece:',p.id);}
await googleApi(`${base}/settings/store?updateMask.fieldPaths=published`,'PATCH',{fields:{published:{booleanValue:false}}});
console.log('Pre-launch collection published; checkout remains disabled.');
