import {createRiftServer} from '../server/index.mjs';

const app=await createRiftServer({
  host:process.env.RIFT_HOST||'127.0.0.1',port:Number(process.env.RIFT_PORT)||4174,
  publicOrigin:process.env.RIFT_ORIGIN||undefined,dataDir:process.env.RIFT_DATA_DIR||undefined,
  adminUsername:process.env.RIFT_ADMIN_USERNAME||undefined,adminPassword:process.env.RIFT_ADMIN_PASSWORD||undefined,
  maxAccounts:Number(process.env.RIFT_MAX_ACCOUNTS)||500,
});
const url=await app.start();
console.log(`Rift Nexus is ready at ${url}`);
console.log('Private self-hosted service. No paid services or external analytics are connected.');
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
