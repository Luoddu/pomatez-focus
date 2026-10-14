import { useEffect, useRef, useState } from "react";
import { api } from "./components/shared";
import { localPreferences, PREFERENCES_CHANGED, PreferenceKey, preferenceJSON, writeLocalPreference } from "./preferences";
import { PreferenceSync, PreferenceSyncStatus } from "./preferenceSync";

export function usePreferenceSync(source: string|null, connected: boolean) {
  const [status,setStatus]=useState<PreferenceSyncStatus>({enabled:false,syncing:false,message:"连接飞书后可同步偏好",conflicts:[],pending:0});
  const controller=useRef<PreferenceSync|null>(null);
  useEffect(()=>{
    if(!connected || !source || !api()?.readPreferences){controller.current=null;setStatus({enabled:false,syncing:false,message:"尚未连接飞书",conflicts:[],pending:0});return;}
    let live=true,changeTimer: ReturnType<typeof setTimeout>|undefined;
    let deviceValues="";
    const bridge=api();
    const local=async()=>{const state=await bridge.restState();if(!live)throw Error("来源已切换");return localPreferences(localStorage,state.settings,state.browserControl.policy);};
    const checkReply=(reply:any)=>{if(!live || reply.sourceKey!==source)throw Error("飞书来源已切换，未应用偏好");return reply.entries;};
    try {
      const sync=new PreferenceSync(localStorage,source,{
        read:async()=>checkReply(await bridge.readPreferences({sourceKey:source})),
        save:async(entry)=>checkReply(await bridge.savePreference({sourceKey:source,entry})),
        local,
        apply:async(key,value,expected)=>{
          if(!live || preferenceJSON((await local())[key])!==preferenceJSON(expected))throw Error("本机偏好已变化，稍后重试");
          if(key==="rest" || key==="browser")await bridge.applyDevicePreference({sourceKey:source,key,value,expected});
          else {if(!live)throw Error("来源已切换");writeLocalPreference(localStorage,key,value);window.dispatchEvent(new Event(PREFERENCES_CHANGED));}
        },
        validScope:()=>live,notify:setStatus,uuid:()=>window.crypto.randomUUID(),
      });
      controller.current=sync;
      void sync.synchronize();
      const refresh=()=>{void sync.synchronize();};
      const changed=()=>{clearTimeout(changeTimer);changeTimer=setTimeout(refresh,1500);};
      const off=bridge.onRestState((state:any)=>{
        const next=preferenceJSON([state.settings,state.browserControl?.policy]);
        if(deviceValues && next!==deviceValues)changed();deviceValues=next;
      });
      const interval=setInterval(()=>{if(document.visibilityState!=="hidden")refresh();},60000);
      window.addEventListener("focus",refresh);window.addEventListener(PREFERENCES_CHANGED,changed);
      return ()=>{live=false;sync.stop();controller.current=null;clearInterval(interval);clearTimeout(changeTimer);off();window.removeEventListener("focus",refresh);window.removeEventListener(PREFERENCES_CHANGED,changed);};
    }catch(e){setStatus({enabled:false,syncing:false,message:(e as Error).message,conflicts:[],pending:0});return ()=>{live=false;};}
  },[source,connected]);
  return {status,sync:()=>{void controller.current?.synchronize();},enable:()=>{void controller.current?.synchronize(true);},disable:()=>controller.current?.disable(),resolve:(key:PreferenceKey,entryId?:string)=>{void controller.current?.synchronize(false,{key,entryId});}};
}
