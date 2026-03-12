/**
 * Unit tests for in-memory IdentityStore.
 * Run with: node --test --experimental-strip-types dist/identity/store.test.js
 * Or: npx tsx node --test identity/store.test.ts (if tsx available)
 * For standard TS: compile first then node --test dist/identity/store.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { IdentityStore } from './store.js';

describe('IdentityStore', () => {
  it('createOrganization and getOrganization', async () => {
    const store = new IdentityStore();
    const org = await store.createOrganization({
      displayName: 'Acme',
      status: 'active',
    });
    assert.ok(org.id.startsWith('org_'));
    assert.strictEqual(org.displayName, 'Acme');
    const found = await store.getOrganization(org.id);
    assert.deepStrictEqual(found, org);
  });

  it('registerAgent and getAgent', async () => {
    const store = new IdentityStore();
    const org = await store.createOrganization({ displayName: 'O', status: 'active' });
    const ws = await store.createWorkspace({ orgId: org.id, displayName: 'W', status: 'active' });
    const agent = await store.registerAgent({
      orgId: org.id,
      workspaceId: ws.id,
      displayName: 'MyAgent',
      approvedTools: ['mcp:server1'],
      defaultTrustLevel: 'medium',
      status: 'active',
    });
    assert.ok(agent.id.startsWith('agent_'));
    assert.strictEqual(agent.displayName, 'MyAgent');
    const found = await store.getAgent(agent.id);
    assert.deepStrictEqual(found, agent);
  });

  it('listAgentsByOrg', async () => {
    const store = new IdentityStore();
    const org = await store.createOrganization({ displayName: 'O', status: 'active' });
    const ws = await store.createWorkspace({ orgId: org.id, displayName: 'W', status: 'active' });
    const a1 = await store.registerAgent({
      orgId: org.id,
      workspaceId: ws.id,
      displayName: 'A1',
      approvedTools: [],
      defaultTrustLevel: 'low',
      status: 'active',
    });
    const a2 = await store.registerAgent({
      orgId: org.id,
      workspaceId: ws.id,
      displayName: 'A2',
      approvedTools: [],
      defaultTrustLevel: 'high',
      status: 'active',
    });
    const list = await store.listAgentsByOrg(org.id);
    assert.strictEqual(list.length, 2);
    assert.ok(list.some((a) => a.id === a1.id));
    assert.ok(list.some((a) => a.id === a2.id));
  });

  it('resolveOnBehalfOf allows when subject in scope', async () => {
    const store = new IdentityStore();
    const org = await store.createOrganization({ displayName: 'O', status: 'active' });
    const ws = await store.createWorkspace({ orgId: org.id, displayName: 'W', status: 'active' });
    const agent = await store.registerAgent({
      orgId: org.id,
      workspaceId: ws.id,
      displayName: 'A',
      approvedTools: [],
      defaultTrustLevel: 'medium',
      status: 'active',
      onBehalfOfScope: ['user_123', 'role:editor'],
    });
    assert.strictEqual(await store.resolveOnBehalfOf(agent.id, 'user_123'), true);
    assert.strictEqual(await store.resolveOnBehalfOf(agent.id, 'role:editor'), true);
    assert.strictEqual(await store.resolveOnBehalfOf(agent.id, 'user_other'), false);
  });

  it('bindApiKeyToAgent and resolveAgentIdByApiKey', async () => {
    const store = new IdentityStore();
    const org = await store.createOrganization({ displayName: 'O', status: 'active' });
    const ws = await store.createWorkspace({ orgId: org.id, displayName: 'W', status: 'active' });
    const agent = await store.registerAgent({
      orgId: org.id,
      workspaceId: ws.id,
      displayName: 'A',
      approvedTools: [],
      defaultTrustLevel: 'medium',
      status: 'active',
    });
    await store.bindApiKeyToAgent('sk-test-key-1', agent.id);
    assert.strictEqual(await store.resolveAgentIdByApiKey('sk-test-key-1'), agent.id);
    assert.strictEqual(await store.resolveAgentIdByApiKey('unknown'), null);
  });
});
