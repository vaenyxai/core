import {exactOrigin,problem,requestJSON} from './protocol.mjs';
const b64=/^[A-Za-z0-9_-]{43,128}$/;
export function createRelayConnection({vault,authorize,clientName,returnPath,fetcher=globalThis.fetch,crypt=globalThis.crypto,origin=globalThis.location?.origin,now=()=>Date.now()}={}){
 let context=null;
 const setContext=value=>{context=value;};
 const erase=(pending,input,reply)=>{pending.verifier='';input.code='';if(reply)reply.token='';};
 const encode=bytes=>globalThis.btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 const random=()=>encode(crypt.getRandomValues(new Uint8Array(32)));
 async function authority(options={}){
  let c;
  try{c=await authorize(options);}
  catch(e){if([401,403,409].includes(e.status)){await vault.clear();setContext(null);throw problem('session_ended');}throw problem('authority_unavailable');}
  if(c.version!==1||c.client_origin!==exactOrigin(origin)||c.return_uri!==origin+returnPath
    ||!/^[a-f0-9]{64}$/.test(c.scope)||!/^[a-f0-9]{64}$/.test(c.session_binding))throw problem('invalid_authority');
  if(context&&context.scope!==c.scope){await vault.clear();setContext(null);throw problem('identity_changed');}
  setContext(c);await vault.open(c.scope);return c;
 }
 async function start(address){
  if(address)exactOrigin(address);
  const c=await authority({operation:'connect',write:true,address}),{data}=await vault.read();
  address=address||c.relay_origin;exactOrigin(address);
  if(data.connection)throw problem('disconnect_first');
  const verifier=random(),state=random(),challenge=encode(await crypt.subtle.digest('SHA-256',new globalThis.TextEncoder().encode(verifier)));
  const pending={...c,relay_origin:address,verifier,state,expires_at:now()+360000};
  await vault.update(d=>{if(d.pending&&d.pending.expires_at>now())throw problem('connection_pending');d.pending=pending;});
  return {action:address+'/v1/relay/connect/start',fields:{version:'1',client_name:clientName,client_origin:c.client_origin,
   return_uri:c.return_uri,state,code_challenge:challenge,code_challenge_method:'S256'}};
 }
 async function complete(input){
  if(!b64.test(input?.code||'')||!b64.test(input?.state||''))throw problem('invalid_return');
  const c=await authority({operation:'connect',write:true}),{epoch}=await vault.read();let pending,reply;
  await vault.update(d=>{pending=d.pending;d.pending=null;},epoch);
  if(!pending||pending.state!==input.state||pending.expires_at<=now()||pending.scope!==c.scope
   ||pending.session_binding!==c.session_binding||pending.return_uri!==c.return_uri||(c.relay_origin&&pending.relay_origin!==c.relay_origin))throw problem('return_mismatch');
  try{
   exactOrigin(pending.relay_origin);
   reply=await requestJSON(pending.relay_origin+'/v1/relay/connect/exchange',{
    method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({version:1,code:input.code,code_verifier:pending.verifier,client_origin:c.client_origin,return_uri:c.return_uri})
   },{fetcher,timeoutMs:15000,run:true});
   if(reply.version!==1||typeof reply.token!=='string'||!reply.token||reply.token.length>8192||/\s/.test(reply.token)
    ||typeof reply.profile_id!=='string'||!reply.profile_id||reply.profile_id.length>160
    ||typeof reply.profile_name!=='string'||reply.profile_name.length>160||!Number.isSafeInteger(reply.key_version)||reply.key_version<1)throw problem('invalid_response');
   const latest=await authority({operation:'connect',write:true});
   if(latest.scope!==c.scope||latest.session_binding!==c.session_binding)throw problem('identity_changed');
   await vault.update(d=>{if(d.connection)throw problem('disconnect_first');d.connection={token:reply.token,profile_id:reply.profile_id,
    profile_name:reply.profile_name,key_version:reply.key_version,relay_origin:pending.relay_origin,saved_at:new Date(now()).toISOString(),catalogue:null,tests:{},attempts:d.attempts??{},selection:null,used:[]};},epoch);
   return {saved:true,profile_id:reply.profile_id};
  }finally{erase(pending,input,reply);}
 }
 async function read(options){const c=await authority(options),saved=await vault.read();if(c.relay_origin&&saved.data.connection&&c.relay_origin!==saved.data.connection.relay_origin)throw problem('connection_changed');return {context:c,...saved};}
 async function clear(){await authority({operation:'disconnect',write:true});await vault.forgetConnection();context=null;}
 async function cancel(){await authority({operation:'cancel',write:true});await vault.update(d=>{d.pending=null;});}
 return {authority,start,complete,read,vault,clear,cancel};
}
