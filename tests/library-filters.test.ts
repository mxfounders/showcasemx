import test from 'node:test';
import assert from 'node:assert/strict';
import {filterSaved,type SavedEntry,type SavedFilters} from '../src/lib/library/filters';
const filters:SavedFilters={query:'',kind:'',category:'',list:'',sort:'recent'};
const entries:SavedEntry[]=[
 {key:'solution:a',project:{key:'solution:a',name:'Zeta Nómina',description:'Pagos del equipo',kind:'Software',categories:['Finanzas','Nómina'],href:'/a',external:false},memberships:['payroll','finance']},
 {key:'solution:b',project:{key:'solution:b',name:'Agencia Ágil',description:'Diseño y operación',kind:'Agencia',categories:['Agencias','Operación'],href:'/b',external:false},memberships:[]},
 {key:'solution:c',memberships:['finance']}
];
test('saved filters intersect text, secondary categories, type and private memberships without duplicates',()=>{
 assert.deepEqual(filterSaved(entries,{...filters,query:'nomina pagos',kind:'Software',category:'Nómina',list:'finance'}).map(item=>item.key),['solution:a']);
 assert.equal(filterSaved(entries,{...filters,query:'nomina',kind:'Agencia'}).length,0);
 assert.deepEqual(filterSaved(entries,{...filters,list:'none'}).map(item=>item.key),['solution:b']);
 assert.deepEqual(filterSaved(entries,{...filters,list:'finance'}).map(item=>item.key),['solution:a','solution:c']);
});
test('saved ordering preserves input, unavailable projects remain removable and search ignores accents',()=>{
 assert.deepEqual(filterSaved(entries,{...filters,sort:'oldest'}).map(item=>item.key),['solution:c','solution:b','solution:a']);
 assert.deepEqual(filterSaved(entries,{...filters,sort:'name'}).map(item=>item.key),['solution:b','solution:c','solution:a']);
 assert.deepEqual(entries.map(item=>item.key),['solution:a','solution:b','solution:c']);
 assert.equal(filterSaved(entries,{...filters,query:'agil operacion'}).length,1);
 assert.equal(filterSaved(entries,{...filters,query:'no disponible'})[0].key,'solution:c');
});
