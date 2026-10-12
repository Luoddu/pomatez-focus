(() => {
  if(globalThis.__pomatezControlInstalled)return;
  globalThis.__pomatezControlInstalled=true;
  let control={blockedUntil:0,expiresAt:0,reason:""},overlay=null,clock=null;
  const blocked=()=>Date.now()<control.blockedUntil&&Date.now()<control.expiresAt;
  const pause=()=>{let count=0;for(const video of document.querySelectorAll("video,audio")){if(!video.paused){video.pause();count++;}}return count;};
  function render() {
    if(!blocked()){if(overlay)overlay.remove();overlay=null;if(clock)clearInterval(clock);clock=null;return;}
    if(!overlay){overlay=document.createElement("div");overlay.dataset.pomatezControl="blocked";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-label","科学专注浏览限制");
      Object.assign(overlay.style,{position:"fixed",inset:"0",zIndex:"2147483647",background:"rgba(248,250,255,.98)",color:"#263047",display:"grid",placeItems:"center",font:"20px system-ui",textAlign:"center"});
      document.documentElement.appendChild(overlay);clock=setInterval(render,1000);}
    const seconds=Math.max(0,Math.ceil((control.blockedUntil-Date.now())/1000));
    overlay.textContent=control.reason==="今日额度已用完"?"今日额度已用完 · 回到农场，开始下一个番茄。":`冷静 ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")} · 回到农场，重新选择。`;
  }
  function apply(v) { control={blockedUntil:Number(v.blockedUntil)||0,expiresAt:Number(v.expiresAt)||0,reason:String(v.reason||"")};const pausedCount=v.pause||blocked()?pause():0;render();return {pausedCount}; }
  chrome.runtime.onMessage.addListener((v,_sender,reply)=>{if(v?.type==="control")reply(apply(v));});
  document.addEventListener("play",event=>{if(blocked()&&event.target instanceof HTMLMediaElement)event.target.pause();},true);
  window.addEventListener("pagehide",()=>{if(clock)clearInterval(clock);clock=null;if(overlay)overlay.remove();overlay=null;});
  chrome.runtime.sendMessage({type:"getControl"},v=>{void chrome.runtime.lastError;if(v)apply(v);});
})();
