(() => {
  if(globalThis.__pomatezControlInstalled)return;
  globalThis.__pomatezControlInstalled=true;
  let control={strict:true,strictAllowedUntil:0,blockedUntil:0,expiresAt:0,reason:"",message:""},overlay=null,clock=null,suspended=false,epoch=0;
  const blocked=()=>{const now=Date.now(),d=new Date(now).getDay();return control.strict&&d>=1&&d<=5?now>=(control.strictAllowedUntil||0):now<control.blockedUntil&&now<control.expiresAt;};
  const pause=()=>{let count=0;for(const video of document.querySelectorAll("video,audio")){if(!video.paused){video.pause();count++;}}return count;};
  function render() {
    if(suspended)return;
    if(control.strict&&!clock)clock=setInterval(()=>{if(blocked())pause();render();},250);
    if(!blocked()){if(overlay)overlay.remove();overlay=null;if(clock&&!control.strict){clearInterval(clock);clock=null;}return;}
    if(!document.documentElement)return;
    if(!overlay){overlay=document.createElement("div");overlay.dataset.pomatezControl="blocked";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-label","科学专注浏览限制");
      Object.assign(overlay.style,{position:"fixed",inset:"0",zIndex:"2147483647",background:"rgba(248,250,255,.98)",color:"#263047",display:"grid",placeItems:"center",font:"20px system-ui",textAlign:"center"});
    }
    if(!overlay.isConnected)document.documentElement.appendChild(overlay);
    if(!clock)clock=setInterval(render,1000);
    const seconds=Math.max(0,Math.ceil((control.blockedUntil-Date.now())/1000));
    overlay.textContent=control.strict?'工作日严格督促 · 需12个有效番茄，B站与小红书累计最多15分钟。请回到农场查看剩余额度。':control.reason==="今日额度已用完"?"今日额度已用完 · 回到农场，开始下一个番茄。":control.reason==="每日专注锁"?control.message:`冷静 ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")} · 回到农场，重新选择。`;
  }
  function apply(v) { control={strict:v.strict===true,strictAllowedUntil:Number(v.strictAllowedUntil)||0,blockedUntil:Number(v.blockedUntil)||0,expiresAt:Number(v.expiresAt)||0,reason:String(v.reason||""),message:typeof v.message==="string"?v.message.slice(0,200):""};const pausedCount=v.pause||blocked()?pause():0;render();return {pausedCount}; }
  chrome.runtime.onMessage.addListener((v,_sender,reply)=>{if(v?.type==="control"){epoch++;reply(apply(v));}});
  document.addEventListener("play",event=>{if(blocked()&&event.target instanceof HTMLMediaElement)event.target.pause();},true);
  const refresh=()=>{const request=++epoch;chrome.runtime.sendMessage({type:"getControl"},v=>{void chrome.runtime.lastError;if(request!==epoch)return;if(v)apply(v);else render();});};
  window.addEventListener("pagehide",()=>{epoch++;suspended=true;if(clock)clearInterval(clock);clock=null;if(overlay)overlay.remove();overlay=null;});
  window.addEventListener("pageshow",()=>{suspended=false;render();refresh();});
  document.addEventListener("DOMContentLoaded",()=>{if(blocked()){pause();render();}},{once:true});
  refresh();
})();
