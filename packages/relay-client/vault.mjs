// Browser-only encrypted connection and diagnostic state. No localStorage or cloud vault.
export const storageError=()=>Object.assign(new Error('Browser storage unavailable; connection was not saved.'),{code:'storage_unavailable'});
export function browserStore({factory=globalThis.indexedDB,name,record}={}){
  let opening;
  async function db(){
    if(!factory)throw storageError();
    if(!opening)opening=new Promise((resolve,reject)=>{
      const r=factory.open(name,1);
      r.onupgradeneeded=()=>r.result.createObjectStore('records');
      r.onerror=r.onblocked=()=>{opening=null;reject(storageError());};
      r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};
    });
    return opening;
  }
  return {async transact(change){
    const database=await db();return new Promise((resolve,reject)=>{
      let result,failure;const tx=database.transaction('records','readwrite'),store=tx.objectStore('records'),read=store.get(record);
      read.onsuccess=()=>{try{const next=change(read.result??null);result=next.result;
        if(next.write!==undefined){if(next.write===null)store.delete(record);else store.put(next.write,record);}
      }catch(error){failure=error;tx.abort();}};
      tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(failure??storageError());
    });
  }};
}
export function createRelayVault(store,crypt=globalThis.crypto){
  const enc=new globalThis.TextEncoder(),dec=new globalThis.TextDecoder();let binding=null;
  const fail=()=>{throw storageError();};
  async function cryptData(mode,row,value){
    try{const iv=mode==='encrypt'?crypt.getRandomValues(new Uint8Array(12)):row.iv;
      const algorithm={name:'AES-GCM',iv,additionalData:enc.encode(JSON.stringify([1,row.scope,row.epoch]))};
      if(mode==='encrypt')return {iv,cipher:await crypt.subtle.encrypt(algorithm,row.key,enc.encode(JSON.stringify(value)))};
      return JSON.parse(dec.decode(await crypt.subtle.decrypt(algorithm,row.key,row.cipher)));
    }catch{fail();}
  }
  const matches=r=>binding&&r?.scope===binding.scope&&r.epoch===binding.epoch;
  async function open(scope){
    if(!/^[a-f0-9]{64}$/.test(scope)||!crypt?.subtle)fail();
    const existing=await store.transact(r=>({result:r}));
    let candidate;
    if(existing?.scope!==scope){
      candidate={scope,epoch:crypt.randomUUID(),revision:0,key:await crypt.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt'])};
      Object.assign(candidate,await cryptData('encrypt',candidate,{pending:null,connection:null,attempts:{}}));
    }
    const row=await store.transact(r=>r?.scope===scope?{result:r}:{write:candidate,result:candidate});
    if(!row||row.key?.extractable!==false||row.key.algorithm?.name!=='AES-GCM')fail();
    binding={scope,epoch:row.epoch};return read();
  }
  async function read(){
    const row=await store.transact(r=>({result:r}));if(!matches(row))fail();
    return {epoch:row.epoch,revision:row.revision,data:await cryptData('decrypt',row)};
  }
  async function update(change,expectedEpoch){
    const row=await store.transact(r=>({result:r}));if(!matches(row)||(expectedEpoch!==undefined&&row.epoch!==expectedEpoch))fail();
    const data=await cryptData('decrypt',row);change(data);
    const next={...row,revision:row.revision+1,...await cryptData('encrypt',row,data)};
    await store.transact(r=>{if(!matches(r)||r.revision!==row.revision)fail();return {write:next};});
    return data;
  }
  // Disconnect drops credentials but keeps no-retry receipts for this identity.
  async function forgetConnection(){
    const row=await store.transact(r=>({result:r}));if(!matches(row))fail();
    const data=await cryptData('decrypt',row);
    const next={...row,epoch:crypt.randomUUID(),revision:row.revision+1};
    Object.assign(next,await cryptData('encrypt',next,{...data,pending:null,connection:null,attempts:{...data.attempts,...data.connection?.attempts}}));
    await store.transact(r=>{if(!matches(r)||r.revision!==row.revision)fail();return {write:next};});
    binding={scope:next.scope,epoch:next.epoch};
  }
  // Clearing invalidates all existing handles, preventing late replies from resaving a key.
  async function clear(){binding=null;await store.transact(()=>({write:null}));}
  return {open,read,update,clear,forgetConnection};
}
