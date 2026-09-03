import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function signUpCompany(email, password, companyName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await setDoc(doc(db, 'profiles', cred.user.uid), {
      kind: 'company', name: companyName, email, gdprConsent: true, createdAt: new Date().toISOString(),
    });
  } catch (e) {
    await cred.user.delete().catch(() => {});
    throw e;
  }
  return cred.user;
}
