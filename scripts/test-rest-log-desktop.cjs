const {spawnSync}=require("node:child_process"),path=require("node:path"),{randomUUID}=require("node:crypto");
const root=path.resolve(__dirname,".."),profile=path.join(root,"artifacts/test-profiles",randomUUID());
for(const phase of ["record","resume"]){
  const env={...process.env,POMATEZ_HEADLESS:"1",POMATEZ_PROFILE:profile,POMO_REST_PHASE:phase};delete env.ELECTRON_RUN_AS_NODE;
  const result=spawnSync(require("electron"),[path.join(root,"tests/rest-log-desktop.cjs"),"--mute-audio"],{cwd:root,env,stdio:"inherit",windowsHide:true,timeout:60000});
  if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
}
