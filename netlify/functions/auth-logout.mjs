import {json,setCookie,authFetch} from './_auth.mjs';
export async function handler(event){const token=(event.headers.authorization||'').replace(/^Bearer\s+/i,'');try{if(token)await authFetch('/logout',{token});}catch{}return json(200,{ok:true},{'Set-Cookie':setCookie('',0)});}
