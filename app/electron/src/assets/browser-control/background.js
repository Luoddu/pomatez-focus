/* NativeMessaging companion: policy comes from the farm, never a second usage counter. */
const HOST="io.github.luoddu.pomatez_focus";
const TARGETS=["*://*.bilibili.com/*","*://*.xiaohongshu.com/*"];
function target(url) { try { const h=new URL(url).hostname; return ["bilibili.com","xiaohongshu.com"].some(d=>h===d||h.endsWith("."+d)); } catch (_) { return false; } }
function decide(state, old, now) {
  const leaseVersion=state?.leaseVersion??1,leaseMs=leaseVersion===2?20000:7000;
  const ok=[1,2].includes(leaseVersion) && state?.v===1 && state.ready===true && state.supervise===true && Number.isSafeInteger(state.expiresAt) && now<=state.expiresAt && state.expiresAt<=now+leaseMs && ["mirror","pause","cooldown","quota"].includes(state.mode);
  // Release the page lease immediately, but keep the original absolute deadline
  // so a short off/disconnect cannot consume the reminder and erase its cooldown.
  if(!ok) return {...old,control:{pause:false,blockedUntil:0,expiresAt:0,reason:""}};
  if(state.focusLock){
    const f=state.focusLock,reason=f.quotaSpent?"今日额度已用完":"每日专注锁";
    const message=f.count===null?"正在确认今日番茄进度，请回到农场。":f.count<f.goal?`今日 ${f.count}/${f.goal} 个有效番茄 · 回到农场，继续主线。`:"今日目标已完成 · 请回到农场，手动临时放行。";
    return {day:state.day,key:state.reminderKey||old.key,mode:state.mode,until:0,control:{pause:f.blocked&&(old.control?.reason!==reason||old.control?.expiresAt<=now),blockedUntil:f.blocked?state.expiresAt:0,expiresAt:state.expiresAt,reason:f.blocked?reason:"",message:f.blocked?message:""}};
  }
  const dayChanged=old.day!==state.day, fresh=state.reminderKey && (dayChanged||old.key!==state.reminderKey), key=state.reminderKey||old.key;
  let until=dayChanged||old.mode!==state.mode?0:old.until||0;
  if(fresh&&state.mode==="cooldown") until=now+state.cooldownMinutes*60000;
  if(state.mode!=="cooldown") until=0;
  if(state.mode==="quota"&&state.quotaSpent) { const d=new Date(now); d.setHours(24,0,0,0); until=d.getTime(); }
  const resumed=state.mode==="cooldown"&&until>now&&old.control?.blockedUntil!==until;
  return {day:state.day,key,mode:state.mode,until,control:{pause:state.mode!=="mirror"&&(!!fresh||resumed),blockedUntil:until,expiresAt:state.expiresAt,reason:state.mode==="quota"&&state.quotaSpent?"今日额度已用完":until>now?"冷静一下，再决定是否继续":""}};
}
if(typeof module!=="undefined") module.exports={target,decide};
else {
  let port=null,timer=null,tries=0,retry=null,connecting=null,epoch=0,current={day:"",key:"",until:0,control:{pause:false,blockedUntil:0,expiresAt:0,reason:""}},serial=Promise.resolve();
  // All activation/install/startup paths share restoration before opening a
  // native port; a late read must never replace newly processed control state.
  const restored=chrome.storage.session.get("control").then(v=>{
    if(v.control)current={...v.control,control:{pause:false,blockedUntil:0,expiresAt:0,reason:""}};
    return true;
  }).catch(()=>{console.warn("科学专注配套状态恢复失败，请重新加载扩展；当前不施加浏览限制。");return false;});
  async function tabs() { return chrome.tabs.query({url:TARGETS}); }
  const owns=(expected,turn)=>turn===epoch&&port===expected;
  async function apply(state,expected,turn) {
    if(!owns(expected,turn))return;
    const decision=decide(state,current,Date.now());
    let count=0;
    for(const tab of await tabs()) {
      if(!owns(expected,turn))return;
      try { const result=await chrome.tabs.sendMessage(tab.id,{type:"control",...decision.control,pause:decision.control.pause&&(tab.active||tab.audible)}); count+=result?.pausedCount||0; } catch (_) {}
    }
    if(!owns(expected,turn))return;
    current=decision;
    await chrome.storage.session.set({control:decision});
    if(!owns(expected,turn))return;
    if(decision.control.pause && expected && typeof state.reminderKey==="string") expected.postMessage({type:"receipt",key:state.reminderKey,pausedCount:Math.min(100,count)});
  }
  function enqueue(state,expected,turn=epoch) { serial=serial.then(()=>apply(state,expected,turn)).catch(()=>{if(owns(expected,turn))stop();}); }
  function release() { epoch++;port=null;current={...current,control:{pause:false,blockedUntil:0,expiresAt:0,reason:""}};if(timer)clearInterval(timer);timer=null;enqueue({v:1,ready:false},null); }
  function stop() { const p=port;release();if(p)p.disconnect(); }
  function connect() {
    if(port)return Promise.resolve();if(connecting)return connecting;
    const turn=epoch;
    connecting=beginConnect(turn).finally(()=>connecting=null);
    return connecting;
  }
  async function beginConnect(turn) {
    if(!(await restored) || port || turn!==epoch) return;
    if(!(await tabs()).length || port || turn!==epoch) return;
    if(retry)clearTimeout(retry);retry=null;
    const p=port=chrome.runtime.connectNative(HOST);
    p.onMessage.addListener(state=>{if(port!==p)return;tries=0;enqueue(state,p);});
    p.onDisconnect.addListener(()=>{void chrome.runtime.lastError;if(port!==p)return;release();if(++tries<=3)retry=setTimeout(()=>void connect(),tries*10000);});
    p.postMessage({type:"status",features:["daily-focus-lock-v1","control-lease-v2"]}); timer=setInterval(()=>{if(port)port.postMessage({type:"status",features:["daily-focus-lock-v1","control-lease-v2"]});},5000);
  }
  chrome.runtime.onMessage.addListener((v,sender,reply)=>{
    if(v?.type==="getControl"&&target(sender.tab?.url)) { reply(current.control);return; }
    if(v?.type==="reconnect"&&!sender.tab) { tries=0;void connect();reply({connected:!!port}); }
  });
  chrome.tabs.onUpdated.addListener((_id,change,tab)=>{if(change.status==="complete"&&target(tab.url))void connect();});
  chrome.tabs.onActivated.addListener(()=>void connect());
  chrome.tabs.onRemoved.addListener(()=>void tabs().then(list=>{if(!list.length)stop();}));
  chrome.runtime.onStartup.addListener(()=>void connect());
  chrome.runtime.onInstalled.addListener(()=>void connect());
  void restored.then(ok=>{if(ok)void connect();});
}
