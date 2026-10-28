const {spawnSync}=require('node:child_process'),path=require('node:path'),{randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'..'),profile=path.join(root,'artifacts/test-profiles',randomUUID()),uiProfile=path.join(root,'artifacts/test-profiles',randomUUID());
for(const phase of ['write','resume','record','ui','ui-resume']){
 const env={...process.env,POMATEZ_HEADLESS:'1',POMATEZ_PROFILE:phase.startsWith('ui')?uiProfile:phase==='record'?path.join(root,'artifacts/test-profiles',randomUUID()):profile,POMO_QUIET_PHASE:phase};delete env.ELECTRON_RUN_AS_NODE;
 const r=spawnSync(require('electron'),[path.join(root,'tests/quiet-sync-desktop.cjs'),'--mute-audio'],{cwd:root,env,windowsHide:true,stdio:'inherit',timeout:60000});
 if(r.error)throw r.error;if(r.status!==0)process.exit(r.status??1);
}
