import {mkdir,copyFile,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {BALANCE_VERSION} from '../src/content.js';
const publicConfig={supabaseUrl:process.env.SUPABASE_URL||'',supabaseKey:process.env.SUPABASE_PUBLISHABLE_KEY||''};
if(publicConfig.supabaseKey&&!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicConfig.supabaseKey))throw new Error('Browser configuration requires a Supabase publishable key. Privileged or legacy keys are not accepted.');
if(publicConfig.supabaseUrl&&!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(publicConfig.supabaseUrl))throw new Error('Browser configuration requires a valid Supabase project URL.');
if(Boolean(publicConfig.supabaseUrl)!==Boolean(publicConfig.supabaseKey))throw new Error('Provide both the Supabase project URL and publishable key, or neither for offline play.');
const files=['index.html','styles-v5.css','manifest.webmanifest','assets/v5-icon.svg','src/content.js','src/engine.js','src/storage.js','src/render.js','src/viewport.js','src/input.js','src/audio.js','src/nexus.js','src/online.js','src/supabase-auth.js','src/checkpoints.js','docs/SELF_HOSTING.md'];
for(const f of files){if(f.endsWith('.js'))execFileSync(process.execPath,['--check',f]);await mkdir('dist/'+f.split('/').slice(0,-1).join('/'),{recursive:true});await copyFile(f,'dist/'+f);}
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',platform:'browser',target:['es2022'],outfile:'dist/src/app.js',minify:true,sourcemap:false,legalComments:'none'});
await writeFile('dist/src/runtime-config.js',`globalThis.__RIFT_CONFIG__=${JSON.stringify(publicConfig)};\n`);
await copyFile('sw.js','dist/sw.js');await writeFile('dist/build.json',JSON.stringify({version:'5.0.0',balance:BALANCE_VERSION,files},null,2));console.log('Built static V5 assets into dist ('+files.length+' assets).');

