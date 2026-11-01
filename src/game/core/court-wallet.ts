/** Court fines are browser-local, like hearings and jail; unique case IDs prevent repeated charges. */
export interface CourtFineLedger { [caseId:string]:number }
export function courtFineTotal(raw:unknown){if(!raw||typeof raw!=="object")return 0;return Object.values(raw).reduce<number>((sum,value)=>sum+(typeof value==='number'&&Number.isFinite(value)&&value>0?value:0),0);}
export function recordCourtFine(raw:unknown,caseId:string,fine:number):CourtFineLedger{
 const ledger:CourtFineLedger={};if(raw&&typeof raw==='object')for(const [key,value]of Object.entries(raw))if(typeof value==='number'&&Number.isFinite(value)&&value>=0)ledger[key]=value;
 if(!Object.hasOwn(ledger,caseId)&&Number.isFinite(fine)&&fine>0)ledger[caseId]=Math.round(fine);return ledger;
}
