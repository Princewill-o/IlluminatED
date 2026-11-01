import test from 'node:test';
import assert from 'node:assert/strict';
import {projectData} from '../scripts/lib/project-data.mjs';
const {courtFineTotal,recordCourtFine}=projectData('src/game/core/court-wallet.ts');
test('local court fines remain idempotent across repeated resolution and reload',()=>{
 let ledger=recordCourtFine(null,'incident-1',40);ledger=recordCourtFine(JSON.parse(JSON.stringify(ledger)),'incident-1',40);assert.equal(courtFineTotal(ledger),40);assert.equal(courtFineTotal(recordCourtFine(ledger,'incident-2',12)),52);
 assert.equal(courtFineTotal({a:NaN,b:Infinity,c:-100,d:'200'}),0);
});
