import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);

export class HttpError extends Error {constructor(status,message,details){super(message);this.status=status;this.details=details;}}
export const fail=(status,message,details)=>{throw new HttpError(status,message,details);};
export function text(value,label,max=160,min=0){if(typeof value!=='string'||value.length<min||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(400,`Invalid ${label}.`);return value;}
export function username(value){const name=text(value,'username',24,3);if(!/^[a-zA-Z0-9_]+$/.test(name))fail(400,'Usernames use 3–24 letters, numbers, or underscores.');return name;}
export function password(value){return text(value,'password',128,10);}
export function object(value,label='request'){if(!value||typeof value!=='object'||Array.isArray(value))fail(400,`Invalid ${label}.`);return value;}
export function number(value,label,min=0,max=1e12){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail(400,`Invalid ${label}.`);return value;}
export function boolean(value,label){if(typeof value!=='boolean')fail(400,`Invalid ${label}.`);return value;}
export async function hashPassword(value){const salt=randomBytes(16).toString('hex');const hash=await scrypt(value,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024});return {salt,hash:hash.toString('hex'),algorithm:'scrypt-v1'};}
export async function checkPassword(value,stored){const salt=stored?.salt||'constant-time-missing-user-salt';const candidate=await scrypt(value,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024});const expected=Buffer.from(stored?.hash||'00'.repeat(64),'hex');return expected.length===candidate.length&&timingSafeEqual(expected,candidate)&&!!stored;}
export const sessionToken=()=>randomBytes(32).toString('base64url');
export const tokenHash=value=>createHash('sha256').update(value).digest('hex');
export function cookies(header=''){const result={};for(const part of header.split(';')){const split=part.indexOf('=');if(split<0)continue;const key=part.slice(0,split).trim();if(key==='rift_session')result[key]=part.slice(split+1).trim();}return result;}

export class RateLimiter {
  constructor(clock=Date.now){this.clock=clock;this.buckets=new Map();}
  take(key,limit,windowMs){
    const now=this.clock();let bucket=this.buckets.get(key);
    if(!bucket||bucket.reset<=now){bucket={count:0,reset:now+windowMs};this.buckets.set(key,bucket);}
    bucket.count++;if(bucket.count>limit)fail(429,'Too many requests. Please wait before trying again.',{retryAfter:Math.max(1,Math.ceil((bucket.reset-now)/1000))});
    if(this.buckets.size>10000)for(const [id,entry] of this.buckets)if(entry.reset<=now)this.buckets.delete(id);
    if(this.buckets.size>20000)this.buckets.delete(this.buckets.keys().next().value);
  }
}
export function readJson(req,maxBytes=32*1024){
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(415,'Send JSON with Content-Type: application/json.');
  const declared=Number(req.headers['content-length']);if(Number.isFinite(declared)&&declared>maxBytes)fail(413,'Request body is too large.');
  return new Promise((resolve,reject)=>{
    let size=0,exceeded=false;const chunks=[];
    req.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){exceeded=true;chunks.length=0;}else if(!exceeded)chunks.push(chunk);});
    req.on('end',()=>{if(exceeded){reject(new HttpError(413,'Request body is too large.'));return;}try{resolve(object(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')));}catch(error){reject(error instanceof HttpError?error:new HttpError(400,'Request body is not valid JSON.'));}});
    req.on('error',reject);req.on('aborted',()=>reject(new HttpError(400,'Request was interrupted.')));
  });
}
