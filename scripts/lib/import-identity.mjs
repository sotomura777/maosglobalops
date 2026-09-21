export const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
export function eligibleEmail(profile, account) {
  if (profile?.kind !== 'worker' || profile.importExperience !== true || !account?.emailVerified || account.disabled) return null;
  const email = normalizeEmail(account.email);
  return email && email === normalizeEmail(profile.email) ? email : null;
}
export function canAssociate(profile, account, sourceEmail, existing, uid) {
  const email = eligibleEmail(profile, account);
  return Boolean(email && email === normalizeEmail(sourceEmail) && (!existing || existing.workerId === uid));
}
