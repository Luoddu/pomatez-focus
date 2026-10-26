const {spawnSync}=require('node:child_process'),path=require('node:path');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const r=spawnSync(require('electron'),[path.join(__dirname,'../tests/focus-capture-desktop.cjs')],{env,windowsHide:true,stdio:'inherit',timeout:70000});
if(r.error)throw r.error;process.exit(r.status??1);
