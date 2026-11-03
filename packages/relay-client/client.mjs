import {exactOrigin,problem,requestJSON} from './protocol.mjs';
export function relayJSON({address,token,path,method,body,timeoutMs=20000,limit=2000000,run=false,fetcher=globalThis.fetch}){
 exactOrigin(address);
 if(typeof token!=='string'||!token||!/^\/v1\/(ai|relay)\/[a-z0-9/?=_-]+$/.test(path))throw problem('invalid_request');
 return requestJSON(address+path,{method:method||(body===undefined?'GET':'POST'),credentials:'omit',
 headers:{authorization:'Bearer '+token,...(body===undefined?{}:{'content-type':'application/json'})},
 ...(body===undefined?{}:{body:JSON.stringify(body)})},{fetcher,timeoutMs,limit,run,secret:token});
}
export function createRelayClient({connection,fetcher=globalThis.fetch}){
 async function request(path,{permission,operation='read',write=false,body,...options}={}){
  const {data}=await connection.read({operation,write,...(permission?{permission}:{})});
  if(!data.connection)throw problem('unconfigured',{unconfigured:true});
  return relayJSON({address:data.connection.relay_origin,token:data.connection.token,path,body,fetcher,...options});
 }
 return {request,profile:()=>request('/v1/relay/profile',{timeoutMs:4000}),
 models:({refresh=false}={})=>request('/v1/relay/models'+(refresh?'?refresh=1':''),{operation:'models',write:refresh}),
 run:(body,options={})=>{if(!body?.engine||!body.model||!body.capability)throw problem('invalid_request');
 return request('/v1/ai/run',{operation:'run',write:true,body,run:true,timeoutMs:125000,...options});}};
}
