import { before, after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes } from 'firebase/storage';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-muanoluxe',storage:{host:'127.0.0.1',port:9199,rules:await readFile('storage.rules','utf8')}});});
after(async()=>env?.cleanup());
test('only administrators upload approved product image types',async()=>{const guest=env.unauthenticatedContext().storage();const staff=env.authenticatedContext('staff',{admin:true}).storage();await assertFails(uploadBytes(ref(guest,'products/guest.png'),new Uint8Array([1]),{contentType:'image/png'}));await assertSucceeds(uploadBytes(ref(staff,'products/safe.png'),new Uint8Array([1]),{contentType:'image/png'}));await assertFails(uploadBytes(ref(staff,'products/unsafe.svg'),new Uint8Array([1]),{contentType:'image/svg+xml'}));await assertFails(uploadBytes(ref(staff,'products/huge.png'),new Uint8Array(5*1024*1024),{contentType:'image/png'}));await assertSucceeds(getBytes(ref(guest,'products/safe.png')));});
