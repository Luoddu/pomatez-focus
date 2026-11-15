const {spawnSync}=require('node:child_process'),path=require('node:path'),{randomUUID}=require('node:crypto'),fs=require('node:fs'),root=path.resolve(__dirname,'..');
const profile=path.join(root,'artifacts/test-profiles','p097-'+randomUUID(),'pomatez-focus');fs.mkdirSync(profile,{recursive:true});
const env={...process.env,POMATEZ_HEADLESS:'1',POMATEZ_PROFILE:profile};delete env.ELECTRON_RUN_AS_NODE;
const r=spawnSync(require('electron'),[path.join(root,'tests/sleep-dashboard-desktop.cjs'),'--mute-audio'],{cwd:root,env,windowsHide:true,stdio:'inherit',timeout:60000});if(r.error)throw r.error;process.exitCode=r.status??1;
