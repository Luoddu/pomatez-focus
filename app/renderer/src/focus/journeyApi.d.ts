import {Journey} from './journey';
export function createJourneyApi(storage:Storage, getContext:()=>any, notify?:(plan:Journey)=>void):(request:any)=>Promise<any>;
export function validateJourneyRequest(request:any):any;
