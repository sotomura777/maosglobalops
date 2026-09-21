// Diagnóstico da versão analisada: estes testes confirmam lacunas, não critérios de segurança aprovados.
// Executar apenas com os emuladores locais iniciados. Nunca liga à produção.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
let env, company, worker, other, outsider;
const offer = {title:'Serviço diagnóstico',category:'Mesa',district:'Porto',location:'Local de teste',date:'2099-10-10',startTime:'18:00',endTime:'23:00',vacancies:1,rate:14,payType:'hour',paymentTerms:'15 dias',description:'Teste isolado',transport:'',meal:'',equipment:'',status:'open',featured:false,companyId:'audit-company',companyName:'Empresa diagnóstico',createdAt:'2026-09-15'};
const application = (jobId, workerId) => ({jobId,workerId,workerName:workerId,companyId:'audit-company',companyName:offer.companyName,title:offer.title,message:'',status:'pending',actorId:workerId,note:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
const change = (db,id,status,actorId) => updateDoc(doc(db,'engagements',id),{status,actorId,note:'',updatedAt:serverTimestamp(),statusUpdatedAt:serverTimestamp()});
before(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-globalops',firestore:{host:'127.0.0.1',port:8080,rules:await readFile(new URL('../../../firestore.rules',import.meta.url),'utf8')}});
  company=env.authenticatedContext('audit-company',{email:'company@example.test',email_verified:false}).firestore();
  worker=env.authenticatedContext('audit-worker',{email:'worker@example.test',email_verified:false}).firestore();
  other=env.authenticatedContext('audit-other',{email:'other@example.test'}).firestore();
  outsider=env.authenticatedContext('audit-outsider').firestore();
  await env.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();
    for (const path of ['jobs/audit-unverified-company','jobs/audit-past','engagements/audit-past_audit-worker']) await deleteDoc(doc(db,path));
    for(const [id,kind,name,email,isPublic] of [['audit-company','company',offer.companyName,'company@example.test',false],['audit-worker','worker','audit-worker','worker@example.test',true],['audit-other','worker','audit-other','other@example.test',false]])
      await setDoc(doc(db,'profiles',id),{kind,name,email,public:isPublic,gdprConsent:true,createdAt:'2026-09-15'});
    await setDoc(doc(db,'validations','audit-private-validation'),{workerId:'audit-other',workerName:'Nome privado diagnóstico',hours:8,viaApp:true});
    for(const id of ['audit-job','audit-overlap']) await setDoc(doc(db,'jobs',id),offer);
    for(const [j,w] of [['audit-job','audit-worker'],['audit-job','audit-other'],['audit-overlap','audit-worker']]) await setDoc(doc(db,'engagements',j+'_'+w),application(j,w));
  });
});
after(async()=>env?.cleanup());
test('Lacuna confirmada: perfil público revela email da conta a outro utilizador',async()=>{
  const s=await assertSucceeds(getDoc(doc(outsider,'profiles','audit-worker')));
  assert.equal(s.data().email,'worker@example.test');
});
test('Lacuna confirmada: validação de perfil privado continua legível',async()=>{
  await assertFails(getDoc(doc(outsider,'profiles','audit-other')));
  const s=await assertSucceeds(getDoc(doc(outsider,'validations','audit-private-validation')));
  assert.equal(s.data().workerName,'Nome privado diagnóstico');
});
test('Lacuna confirmada: empresa sem email verificado publica oferta',async()=>{
  await assertSucceeds(setDoc(doc(company,'jobs','audit-unverified-company'),offer));
});
test('Lacuna confirmada: duas confirmações para uma única vaga',async()=>{
  for(const [id,db,uid] of [['audit-job_audit-worker',worker,'audit-worker'],['audit-job_audit-other',other,'audit-other']]){
    await assertSucceeds(change(company,id,'accepted','audit-company'));
    await assertSucceeds(change(db,id,'confirmed',uid));
  }
});
test('Lacuna confirmada: profissional confirma outro trabalho no mesmo horário',async()=>{
  await assertSucceeds(change(company,'audit-overlap_audit-worker','accepted','audit-company'));
  await assertSucceeds(change(worker,'audit-overlap_audit-worker','confirmed','audit-worker'));
});
test('Lacuna confirmada: conclusão bilateral antes da data do serviço',async()=>{
  await assertSucceeds(change(company,'audit-job_audit-worker','completion_requested','audit-company'));
  await assertSucceeds(change(worker,'audit-job_audit-worker','completed','audit-worker'));
});
test('Lacuna confirmada: acesso direto aceita candidatura para oferta passada aberta',async()=>{
  await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'jobs','audit-past'),{...offer,date:'2000-01-01'}));
  await assertSucceeds(setDoc(doc(worker,'engagements','audit-past_audit-worker'),application('audit-past','audit-worker')));
});
