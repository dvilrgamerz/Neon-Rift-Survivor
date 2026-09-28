/** Save encounter starts and safe intermissions; never turn mid-combat rewards into a save point. */
export function createCheckpointWriter({serialize,write,onSaved=()=>{},onError=()=>{}}) {
  let tail=Promise.resolve(),lastKey='';
  function capture(run,{entry=false,force=false}={}) {
    if(!run||run.coOp||run.config.mode!=='campaign'||run.state==='gameover')return tail;
    const safe=entry||['route','shop','event'].includes(run.state)||(run.state==='reward'&&run.pendingCompletion);
    if(!safe)return tail;
    const data=serialize(run);
    const key=JSON.stringify(data);
    if(!force&&key===lastKey)return tail;
    lastKey=key;
    tail=tail.then(()=>write(data)).then(()=>onSaved(data)).catch(error=>{lastKey='';onError(error);throw error;});
    // Each caller receives the failure, but a failed write must not poison later writes.
    const result=tail;tail=tail.catch(()=>{});return result;
  }
  return {capture,flush:()=>tail,reset:()=>{lastKey='';}};
}
