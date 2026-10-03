import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:390,height:844}});
page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
page.on('pageerror',e=>console.log('PAGE ERROR',e.message,e.stack));
await page.goto('http://127.0.0.1:5186/');
await page.getByRole('button',{name:'Open shopping assistant'}).click();await page.getByRole('button',{name:'Delivery details'}).click();await page.waitForTimeout(1500);console.log((await page.locator('body').innerText()).slice(-1200));await browser.close();

