const {spawnSync}=require('node:child_process'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),env={...process.env,POMATEZ_HEADLESS:'1',POMATEZ_PROFILE:path.join(root,'artifacts/test-profiles','board-midnight-'+crypto.randomUUID())};delete env.ELECTRON_RUN_AS_NODE;
const r=spawnSync(require('electron'),[path.join(root,'tests/board-midnight-desktop.cjs'),'--mute-audio'],{cwd:root,env,windowsHide:true,stdio:'inherit',timeout:45000});if(r.error)throw r.error;process.exit(r.status??1);
