/**
 * Unit tests for resolveCallerIdentity.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { IdentityStore } from './store.js';
import { resolveCallerIdentity } from './auth.js';

describe('resolveCallerIdentity', () => {
  it('returns UNAUTHENTICATED when no API key or Bearer token', async () => {
    const store = new IdentityStore();
    const result = await resolveCallerIdentity(store, { headers: {} });
    assert.strictEqual(result.ok, false);
    if (!result.ok) assert.strictEqual(result.code, 'UNAUTHENTICATED');
  });

  it('resolves agent by x-api-key when key bound to agent', async () => {
    const store = new IdentityStore();
    const org = await store.createOrganization({ displayName: 'O', status: 'active' });
    const ws = await store.createWorkspace({ orgId: org.id, displayName: 'W', status: 'active' });
    const agent = await store.registerAgent({
      orgId: org.id,
      workspaceId: ws.id,
      displayName: 'TestAgent',
      approvedTools: ['mcp:x'],
      defaultTrustLevel: 'high',
      status: 'active',
    });
    await store.bindApiKeyToAgent('sk-agent-key', agent.id);

    const result = await resolveCallerIdentity(store, {
      headers: { 'x-api-key': 'sk-agent-key' },
    });
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.context.agentId, agent.id);
      assert.strictEqual(result.context.orgId, org.id);
      assert.strictEqual(result.context.identity.kind, 'agent');
    }
  });

  it('returns AGENT_REVOKED when agent status is revoked', async () => {
    const store = new IdentityStore();
    const org = await store.createOrganization({ displayName: 'O', status: 'active' });
    const ws = await store.createWorkspace({ orgId: org.id, displayName: 'W', status: 'active' });
    const agent = await store.registerAgent({
      orgId: org.id,
      workspaceId: ws.id,
      displayName: 'Revoked',
      approvedTools: [],
      defaultTrustLevel: 'low',
      status: 'revoked',
    });
    await store.bindApiKeyToAgent('sk-revoked', agent.id);

    const result = await resolveCallerIdentity(store, {
      headers: { 'x-api-key': 'sk-revoked' },
    });
    assert.strictEqual(result.ok, false);
    if (!result.ok) assert.strictEqual(result.code, 'AGENT_REVOKED');
  });

  it('resolves onBehalfOf when header set and agent has scope', async () => {
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
      onBehalfOfScope: ['user_alice'],
    });
    await store.bindApiKeyToAgent('sk-alice-agent', agent.id);

    const result = await resolveCallerIdentity(store, {
      headers: { 'x-api-key': 'sk-alice-agent', 'x-on-behalf-of': 'user_alice' },
    });
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.ok(result.context.onBehalfOf);
      assert.strictEqual(result.context.onBehalfOf!.subject, 'user_alice');
    }
  });

  it('returns INVALID_ON_BEHALF_OF when subject not in agent scope', async () => {
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
      onBehalfOfScope: ['user_alice'],
    });
    await store.bindApiKeyToAgent('sk-agent', agent.id);

    const result = await resolveCallerIdentity(store, {
      headers: { 'x-api-key': 'sk-agent', 'x-on-behalf-of': 'user_bob' },
    });
    assert.strictEqual(result.ok, false);
    if (!result.ok) assert.strictEqual(result.code, 'INVALID_ON_BEHALF_OF');
  });

  it('resolves user when API key bound to user', async () => {
    const store = new IdentityStore();
    const org = await store.createOrganization({ displayName: 'O', status: 'active' });
    const user = await store.createUser({
      orgId: org.id,
      workspaceIds: [],
      displayName: 'Human',
      status: 'active',
    });
    await store.bindApiKeyToUser('sk-user-key', user.id);

    const result = await resolveCallerIdentity(store, {
      headers: { 'x-api-key': 'sk-user-key' },
    });
    assert.strictEqual(result.ok, true);
    if (result.ok) {
      assert.strictEqual(result.context.userId, user.id);
      assert.strictEqual(result.context.orgId, org.id);
      assert.strictEqual(result.context.identity.kind, 'user');
    }
  });
});
