import {problem,exactOrigin} from './protocol.mjs';
export async function validateReturn(request,{relayOrigin,origin,returnPath,limit=2048}){
 const url=new globalThis.URL(request.url);exactOrigin(relayOrigin);exactOrigin(origin);
 if(request.method!=='POST'||url.origin!==origin||url.pathname!==returnPath||url.search
  ||request.headers.get('origin')!==relayOrigin||request.headers.get('content-type')?.split(';')[0]!=='application/x-www-form-urlencoded')throw problem('invalid_return');
 const reader=request.body?.getReader();if(!reader)throw problem('invalid_return');
 let size=0;const chunks=[];
 try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>limit){await reader.cancel();throw problem('invalid_return');}chunks.push(r.value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 const form=new globalThis.URLSearchParams(new globalThis.TextDecoder().decode(bytes)),valid=/^[A-Za-z0-9_-]{43,128}$/;
 if([...form.keys()].length!==2||form.getAll('code').length!==1||form.getAll('state').length!==1||!valid.test(form.get('code')||'')||!valid.test(form.get('state')||''))throw problem('invalid_return');
 return {code:form.get('code'),state:form.get('state')};
}
