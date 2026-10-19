import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
const context=new AsyncLocalStorage<string>();
export function requestCorrelationId(){return context.getStore()||randomUUID();}
export function withRequestContext<T>(run:()=>T){return context.run(randomUUID(),run);}
export function logFailure(event:string,error:unknown){console.error(JSON.stringify({event,correlationId:requestCorrelationId(),error:error instanceof Error?error.name:'unknown'}));}
