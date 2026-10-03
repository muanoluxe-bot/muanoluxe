import { googleApi } from './firebase-client.mjs';
const services=['firestore.googleapis.com','cloudfunctions.googleapis.com','cloudbuild.googleapis.com','artifactregistry.googleapis.com','run.googleapis.com','eventarc.googleapis.com','cloudscheduler.googleapis.com','secretmanager.googleapis.com','firebaseappcheck.googleapis.com','recaptchaenterprise.googleapis.com','firebasestorage.googleapis.com'];
const result=await googleApi('https://serviceusage.googleapis.com/v1/projects/188217994921/services:batchEnable','POST',{serviceIds:services});
console.log('Service setup requested:',result.name);
