import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eligibleEmail, canAssociate } from '../scripts/lib/import-identity.mjs';
import { publicProfile } from '../src/services/publicProfile.js';
const profile = { kind: 'worker', importExperience: true, email: 'staff@example.com' };
const account = { email: ' Staff@Example.com ', emailVerified: true, disabled: false };
test('import requires explicit consent and matching verified active Auth account', () => {
  assert.equal(eligibleEmail(profile, account), 'staff@example.com');
  for (const changes of [{ importExperience: false }, { importExperience: undefined }, { kind: 'company' }, { email: 'other@example.com' }]) assert.equal(eligibleEmail({ ...profile, ...changes }, account), null);
  for (const changes of [{ emailVerified: false }, { disabled: true }, { email: '' }]) assert.equal(eligibleEmail(profile, { ...account, ...changes }), null);
});
test('source identity cannot transfer an existing proof to a different account', () => {
  assert.equal(canAssociate(profile, account, profile.email, undefined, 'a'), true);
  assert.equal(canAssociate(profile, account, profile.email, { workerId: 'a' }, 'a'), true);
  assert.equal(canAssociate(profile, account, profile.email, { workerId: 'b' }, 'a'), false);
  assert.equal(canAssociate(profile, account, 'other@example.com', undefined, 'a'), false);
  assert.equal(canAssociate({ ...profile, importExperience: false }, account, profile.email, undefined, 'a'), false);
});
test('public projection strips private fields, including nested legacy data', () => {
  const result = publicProfile({ ...profile, name: 'Ana', public: true, phone: '123', gdprConsent: true, verified: true, experience: [{ company: 'A', role: 'Mesa', email: 'private', phone: '123', metadata: { secret: true } }] });
  assert.deepEqual(result, { kind: 'worker', name: 'Ana', public: true, experience: [{ company: 'A', role: 'Mesa' }] });
});
