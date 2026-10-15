import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function ManualEntryDialog({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
  const root=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const background=document.querySelector<HTMLElement>(".focus-app");
    const oldInert=(background as any)?.inert;
    const bodyOverflow=document.body.style.overflow,bodyPadding=document.body.style.paddingRight;
    const scrollbar=Math.max(0,window.innerWidth-document.documentElement.clientWidth);
    if(background)(background as any).inert=true;
    document.body.style.paddingRight=`${parseFloat(getComputedStyle(document.body).paddingRight)+scrollbar}px`;
    document.body.style.overflow="hidden";
    root.current?.querySelector<HTMLElement>("select,input,button")?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.defaultPrevented)return;
      if(e.key==="Escape"){e.preventDefault();close.current();return;}
      if(e.key!=="Tab")return;
      const items=Array.from(root.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')||[]).filter(x=>x.getClientRects().length);
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
    };
    document.addEventListener("keydown",key);
    return ()=>{document.removeEventListener("keydown",key);if(background)(background as any).inert=oldInert;document.body.style.overflow=bodyOverflow;document.body.style.paddingRight=bodyPadding;previous?.focus({preventScroll:true});};
  },[]);
  return createPortal(<div className="manual-dialog-backdrop"><div className="manual-dialog" role="dialog" aria-modal="true" aria-label={title} ref={root}>
    <div className="manual-dialog-title"><h2>{title}</h2><button type="button" className="btn-small outline" aria-label={`关闭${title}`} onClick={onClose}>×</button></div>
    {children}
  </div></div>,document.body);
}
