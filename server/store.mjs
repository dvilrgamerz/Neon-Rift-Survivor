import {mkdir,readFile,open,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const MAX_DATABASE_BYTES=128*1024*1024;
export const emptyDatabase=()=>({schema:1,users:{},cloudSaves:{},friendRequests:{},friendships:[],notices:{},runs:{},reports:[]});

/** A single writer and atomic file replacement keep concurrent account/save requests consistent. */
export async function createStore(directory) {
  const dataDir=path.resolve(directory),file=path.join(dataDir,'nexus.json');
  await mkdir(dataDir,{recursive:true,mode:0o700});
  let state;
  try {
    const text=await readFile(file,'utf8');
    if(Buffer.byteLength(text)>MAX_DATABASE_BYTES)throw new Error('The Nexus database exceeds its configured safety limit.');
    state=JSON.parse(text);
    if(state.schema!==1||!state.users||!state.cloudSaves||!Array.isArray(state.reports))throw new Error('Unsupported Nexus database. Preserve a backup and use the matching server version.');
  } catch(error) { if(error.code!=='ENOENT')throw error;state=emptyDatabase(); }
  let queue=Promise.resolve();
  async function write(next) {
    const body=JSON.stringify(next);
    if(Buffer.byteLength(body)>MAX_DATABASE_BYTES){const error=new Error('The self-hosted server storage limit has been reached.');error.status=507;throw error;}
    const temporary=path.join(dataDir,`.nexus-${randomUUID()}.tmp`);
    let handle;
    try {
      handle=await open(temporary,'wx',0o600);await handle.writeFile(body,'utf8');await handle.sync();await handle.close();handle=null;
      await rename(temporary,file);
    } finally {await handle?.close().catch(()=>{});await unlink(temporary).catch(()=>{});}
  }
  return {
    get state(){return state;},
    update(mutator){
      const operation=queue.then(async()=>{const next=structuredClone(state);const result=await mutator(next);await write(next);state=next;return structuredClone(result);});
      queue=operation.catch(()=>{});return operation;
    },
    async flush(){await queue;},
    file,
  };
}
