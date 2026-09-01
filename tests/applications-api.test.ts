import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from '../src/app/api/applications/route';
test('legacy anonymous intake cannot bypass account ownership',async()=>{const response=await POST();assert.equal(response.status,410);assert.equal((await response.json()).url,'/account/solutions/new');});
