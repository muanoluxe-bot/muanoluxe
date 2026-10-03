import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { googleApi } from './firebase-client.mjs';
const {email}=JSON.parse(await readFile('artifacts/live-verification.json','utf8'));
if(!/^muanoluxe-qa-\d+@example\.invalid$/.test(email))throw new Error('Refusing to remove a non-test subscriber.');
const id=createHash('sha256').update(email).digest('hex'),base='https://firestore.googleapis.com/v1/projects/muanoluxe/databases/(default)/documents';
for(const path of [`subscribers/${id}`,`notifications/subscriber-${id}`]){try{const doc=await googleApi(`${base}/${path}`);if(path.startsWith('subscribers/'))console.log('Verified test subscription persisted with consent:',doc.fields.consent.booleanValue);else console.log('Verified persistent subscription notification:',doc.fields.type.stringValue);await googleApi(`${base}/${path}`,'DELETE');console.log('Removed test record:',path.split('/')[0]);}catch(e){if(e.status!==404)throw e;console.log('No test record found:',path.split('/')[0]);}}
