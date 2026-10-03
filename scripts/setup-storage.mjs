import { googleApi } from './firebase-client.mjs';
const url='https://firebasestorage.googleapis.com/v1alpha/projects/muanoluxe/defaultBucket';
try{const existing=await googleApi(url);console.log('Existing storage bucket preserved:',existing.bucket?.name);}catch(e){if(e.status!==404)throw e;const created=await googleApi(url,'POST',{location:'europe-west1'});console.log('Product image storage created:',created.bucket?.name);}
