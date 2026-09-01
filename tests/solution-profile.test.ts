import assert from 'node:assert/strict';
import test from 'node:test';
import {emptySolution,readSolutionData,solutionErrors} from '../src/lib/solutions/model';
import {questionErrors,questionIndex,solutionQuestions,isSolutionQuestion} from '../src/lib/solutions/questions';
const founder={name:'Public name',role:'Cofounder',bio:'Professional introduction.',links:[{label:'LinkedIn',url:'https://linkedin.com/in/example'}]};
test('public founders and links are bounded and cannot smuggle private account metadata',()=>{
 const data=readSolutionData({...emptySolution,founders:[{...founder,email:'private',account_id:'fake'}],projectLinks:[{label:'GitHub',url:'https://github.com/example',verified:true}]})!;
 assert.deepEqual(data.founders,[founder]);assert.deepEqual(data.projectLinks,[{label:'GitHub',url:'https://github.com/example'}]);
 for(const patch of [{founders:Array(4).fill(founder)},{founders:[{...founder,name:'x'.repeat(101)}]},{founders:[{...founder,links:Array(5).fill(founder.links[0])}]},{projectLinks:[{label:'Verified',url:'https://example.com'}]},{projectLinks:Array(7).fill(founder.links[0])}])assert.equal(readSolutionData({...emptySolution,...patch}),null);
 const draft=readSolutionData({...emptySolution,founders:[{...founder,name:'',links:[{label:'X',url:''}]}],projectLinks:[{label:'X',url:'javascript:alert(1)'}]})!;
 assert.ok(draft);assert.ok(solutionErrors(draft).founders);assert.ok(solutionErrors(draft).projectLinks);
});
test('guided form resumes old phases, validates only current question and still rejects bad optional URLs',()=>{
 for(const step of [0,1,2,3])assert.equal(solutionQuestions[questionIndex(null,step)].phase,step);
 assert.equal(solutionQuestions[questionIndex('founders',0)].id,'founders');assert.equal(isSolutionQuestion('constructor'),false);
 assert.deepEqual(questionErrors({...emptySolution,name:'Example'},questionIndex('identity')),[]);
 assert.ok(questionErrors({...emptySolution,demoUrl:'https://user:secret@example.com'},questionIndex('demo')).length);
 assert.deepEqual(questionErrors(emptySolution,questionIndex('founders')),[]);
 assert.equal(solutionQuestions[solutionQuestions.length-1].id,'review');
});
