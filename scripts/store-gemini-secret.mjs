import { googleApi } from './firebase-client.mjs';
import { readFile } from 'node:fs/promises';
const contents=await readFile('gemini API.txt','utf8');const key=contents.trim().match(/^[!-~]{30,200}$/)?.[0];
if(!key)throw new Error('No valid Gemini API key was found in the local key file.');
const base='https://secretmanager.googleapis.com/v1/projects/muanoluxe/secrets/GEMINI_API_KEY';
try{await googleApi(base);}catch(e){if(e.status!==404)throw e;await googleApi('https://secretmanager.googleapis.com/v1/projects/muanoluxe/secrets?secretId=GEMINI_API_KEY','POST',{replication:{automatic:{}}});}
await googleApi(base+':addVersion','POST',{payload:{data:Buffer.from(key).toString('base64')}});
console.log('Gemini key saved securely in Secret Manager. No key was written to the web app.');

