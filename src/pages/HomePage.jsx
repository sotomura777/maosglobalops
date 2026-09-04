import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { signOut } from '../services/authService';
import { listValidationsFor, listAllValidations, listWorkEntries } from '../services/workService';
import { listPublicProfiles } from '../services/profileService';
import { listOpenJobs } from '../services/jobsService';
import { S, MONO, LightThread, CompanyMark, GOLD_GRAD, levelFromScore, scoreOf, initials } from '../ui';

const eur = (v) => `${(Math.round(v * 100) / 100).toLocaleString('pt-PT')} €`;

const TABS = [
  ['Início', '/app'], ['Trabalhos', '/app/trabalhos'], ['Ganhos', '/app/ganhos'],
  ['Canais', '/app/canais'], ['Perfil', '/app/perfil'],
];
const TABS_COMPANY = [
  ['Início', '/app'], ['Trabalhos', '/app/meus-trabalhos'], ['Diretório', '/app/diretorio'],
  ['Canais', '/app/canais'], ['Perfil', '/app/perfil'],
];

function TabBar({ tabs, navigate }) {
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(10,10,11,.92)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--border)', display: 'flex', padding: '12px 0 17px', zIndex: 50 }}>
      {tabs.map(([lbl, to], i) => (
        <button key={lbl} onClick={() => to !== '/app' && navigate(to)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'center', background: 'none', border: 'none' }}>
          <span style={{ width: 16, height: 16, borderRadius: i === tabs.length - 1 ? 99 : 6, background: i === 0 ? 'var(--text)' : 'transparent', border: i === 0 ? 'none' : '1.5px solid var(--text-5)' }} />
          <span style={{ font: `${i === 0 ? 700 : 500} 9px/1 'Public Sans', sans-serif`, color: i === 0 ? 'var(--text)' : 'var(--text-3)' }}>{lbl}</span>
        </button>
      ))}
    </nav>
  );
}

export default function HomePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isWorker = profile?.kind !== 'company';
  const [data, setData] = useState({ myVals: [], rank: null, monthEur: 0, monthHours: 0, jobs: [] });

  useEffect(() => {
    if (!user?.uid || !isWorker) return;
    (async () => {
      const [myVals, allVals, pubs, entries, jobs] = await Promise.all([
        listValidationsFor(user.uid).catch(() => []),
        listAllValidations().catch(() => []),
        listPublicProfiles().catch(() => []),
        listWorkEntries(user.uid).catch(() => []),
        listOpenJobs().catch(() => []),
      ]);
      // posição no ranking (mesma fórmula da página de ranking)
      const pubIds = new Set(pubs.map(p => p.id));
      const agg = {};
      allVals.forEach(v => {
        if (!pubIds.has(v.workerId)) return;
        agg[v.workerId] = agg[v.workerId] || { count: 0, hours: 0 };
        agg[v.workerId].count += Number(v.jobs) || 1;
        agg[v.workerId].hours += Number(v.hours) || 0;
      });
      const sorted = Object.entries(agg).map(([id, v]) => ({ id, score: scoreOf(v) })).sort((a, b) => b.score - a.score);
      const pos = sorted.findIndex(r => r.id === user.uid);
      const mPrefix = new Date().toISOString().slice(0, 7);
      const month = entries.filter(e => (e.date || '').startsWith(mPrefix));
      setData({
        myVals,
        rank: pos >= 0 ? pos + 1 : null,
        monthEur: month.reduce((a, e) => a + e.hours * e.rate, 0),
        monthHours: month.reduce((a, e) => a + e.hours, 0),
        jobs: jobs.slice(0, 3),
      });
    })();
  }, [user?.uid, isWorker]);

  const lvl = useMemo(() => {
    const agg = data.myVals.reduce((a, v) => ({ count: a.count + (Number(v.jobs) || 1), hours: a.hours + (Number(v.hours) || 0) }), { count: 0, hours: 0 });
    return { ...levelFromScore(scoreOf(agg)), events: agg.count, hours: agg.hours };
  }, [data.myVals]);

  const firstName = (profile?.name || '').split(' ')[0] || '—';

  return (
    <div style={{ minHeight: '100vh', maxWidth: 560, margin: '0 auto', paddingBottom: 90 }}>
      {/* topbar */}
      <div style={{ padding: '17px 20px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ font: "800 14px/1 'Public Sans', sans-serif", letterSpacing: '-.02em' }}>globalops</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <button onClick={() => signOut().then(() => navigate('/', { replace: true }))}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 99, padding: '7px 12px', font: "600 11px/1 'Public Sans', sans-serif", color: 'var(--text-2)' }}>Sair</button>
          <div style={{ width: 32, height: 32, borderRadius: 99, background: 'rgba(255,255,255,.08)', font: "700 11px/32px 'Public Sans', sans-serif", textAlign: 'center', color: 'var(--text-2)' }}>{initials(profile?.name)}</div>
        </div>
      </div>

      <div style={{ padding: '8px 20px 26px', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {isWorker ? (
          <>
            {/* cartão de nível — gradiente radial + fio de luz */}
            <div style={{ ...S.hero, borderRadius: 24, padding: '26px 22px', background: 'radial-gradient(120% 130% at 8% 0%, #1E2024 0%, #121315 46%, #0D0E10 100%)' }}>
              <LightThread inset={22} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ font: "500 12px/1 'Public Sans', sans-serif", color: 'var(--text-3)' }}>Olá, {firstName}</span>
                <span style={{ font: "600 10px/1 'Public Sans', sans-serif", letterSpacing: '.1em', textTransform: 'uppercase', color: '#0A0A0B', background: GOLD_GRAD, borderRadius: 99, padding: '6px 11px' }}>{lvl.league}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <span style={{ font: "800 66px/.85 'Public Sans', sans-serif", letterSpacing: '-.05em', background: 'linear-gradient(180deg, #FFFFFF 30%, #9BA3A9)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{lvl.level}</span>
                <div style={{ paddingBottom: 7 }}>
                  <div style={{ font: "700 17px/1 'Public Sans', sans-serif", letterSpacing: '-.02em' }}>Operacional</div>
                  <div style={{ font: `400 12px/1 ${MONO}`, color: 'var(--text-3)', marginTop: 8 }}>{lvl.xp.toLocaleString('pt-PT')} XP</div>
                </div>
              </div>
              <div style={{ marginTop: 22 }}>
                <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round(lvl.progress * 100)}%`, height: 6, borderRadius: 99, background: 'linear-gradient(90deg, #8E969D, #FFFFFF)' }} />
                </div>
                <div style={{ font: `400 11px/1 ${MONO}`, color: 'var(--text-4)', marginTop: 10 }}>faltam {lvl.missing} para o nível {lvl.level + 1}</div>
              </div>
            </div>

            {/* ganhos do mês + ranking */}
            <div style={{ display: 'flex', gap: 11 }}>
              <button onClick={() => navigate('/app/ganhos')} style={{ ...S.card, flex: 1, display: 'flex', flexDirection: 'column', gap: 9, textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ font: "500 11px/1 'Public Sans', sans-serif", color: 'var(--text-4)' }}>Este mês</span>
                <span style={{ font: "800 29px/1 'Public Sans', sans-serif", letterSpacing: '-.04em', color: 'var(--text)' }}>{eur(data.monthEur)}</span>
                <span style={{ font: "400 11px/1 'Public Sans', sans-serif", color: 'var(--text-3)' }}>{Math.round(data.monthHours * 10) / 10} h registadas</span>
              </button>
              <button onClick={() => navigate('/app/ranking')} style={{ ...S.card, flex: 1, display: 'flex', flexDirection: 'column', gap: 9, textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ font: "500 11px/1 'Public Sans', sans-serif", color: 'var(--text-4)' }}>Ranking</span>
                <span style={{ font: "800 29px/1 'Public Sans', sans-serif", letterSpacing: '-.04em', color: 'var(--text)' }}>{data.rank ?? '—'}</span>
                <span style={{ font: "400 11px/1 'Public Sans', sans-serif", color: 'var(--text-3)' }}>{data.rank ? 'nacional' : 'sem validações ainda'}</span>
              </button>
            </div>

            {/* abertos perto de ti */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ font: "700 15px/1 'Public Sans', sans-serif", letterSpacing: '-.02em' }}>Abertos perto de ti</span>
                <button onClick={() => navigate('/app/trabalhos')} style={{ background: 'none', border: 'none', font: "500 11px/1 'Public Sans', sans-serif", color: 'var(--text-3)' }}>ver todos →</button>
              </div>
              {data.jobs.length === 0 ? (
                <div style={{ ...S.card, borderRadius: 16, padding: '15px 17px', font: "400 12px/1.5 'Public Sans', sans-serif", color: 'var(--text-4)' }}>
                  Ainda sem trabalhos abertos — assim que uma empresa publicar, aparece aqui.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {data.jobs.map(j => (
                    <button key={j.id} onClick={() => navigate('/app/trabalhos')}
                      style={{ ...S.card, borderRadius: 16, padding: '15px 17px', display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', cursor: 'pointer' }}>
                      <CompanyMark name={j.companyName} color={j.brandColor} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', font: "600 15px/1.2 'Public Sans', sans-serif", letterSpacing: '-.02em', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</span>
                        <span style={{ display: 'block', font: "400 12px/1.3 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 4 }}>{j.district}{j.date ? ` · ${j.date}` : ''}</span>
                      </span>
                      {j.pay && <span style={{ font: `400 14px/1 ${MONO}`, color: 'var(--text)', flex: 'none' }}>{j.pay}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* cartão de perfil */}
            <button onClick={() => navigate('/app/perfil')} style={{ ...S.card, borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 17, textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[[lvl.events, 'eventos'], [Math.round(lvl.hours).toLocaleString('pt-PT'), 'horas'], [data.rank ? `${data.rank}º` : '—', 'ranking']].map(([n, l]) => (
                  <span key={l}>
                    <span style={{ display: 'block', font: "800 24px/1 'Public Sans', sans-serif", letterSpacing: '-.04em', color: 'var(--text)' }}>{n}</span>
                    <span style={{ display: 'block', font: "400 11px/1 'Public Sans', sans-serif", color: 'var(--text-4)', marginTop: 7 }}>{l}</span>
                  </span>
                ))}
              </span>
              {(profile?.categories || []).length > 0 && (
                <span style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {profile.categories.slice(0, 4).map(c => (
                    <span key={c} style={{ font: "600 11px/1 'Public Sans', sans-serif", color: 'var(--text-2)', background: 'rgba(255,255,255,.06)', borderRadius: 99, padding: '8px 12px' }}>{c}</span>
                  ))}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(52,211,153,.09)', borderRadius: 13, padding: '12px 14px' }}>
                <span style={{ font: "700 12px/1 'Public Sans', sans-serif", color: 'var(--green)' }}>✓</span>
                <span style={{ font: "500 12px/1.4 'Public Sans', sans-serif", color: '#9FDCC2' }}>
                  {data.myVals.length > 0 ? `${data.myVals.length} ${data.myVals.length === 1 ? 'experiência validada' : 'experiências validadas'}` : 'completa o teu perfil para ganhares validações'}
                </span>
              </span>
            </button>
          </>
        ) : (
          <>
            {/* empresa — cabeçalho com pastilha dourada */}
            <div style={{ ...S.hero, borderRadius: 24, padding: '26px 22px' }}>
              <LightThread inset={22} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <CompanyMark name={profile?.name} color={profile?.brandColor} size={44} radius={14} fontSize={13} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "700 20px/1.15 'Public Sans', sans-serif", letterSpacing: '-.03em' }}>{profile?.name || '—'}</div>
                  <div style={{ font: "400 12px/1.4 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 5 }}>Conta de empresa</div>
                </div>
                <span style={{ font: "600 10px/1 'Public Sans', sans-serif", color: 'var(--gold)', background: 'rgba(240,201,106,.12)', borderRadius: 99, padding: '6px 10px', flex: 'none' }}>empresa</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[['Os meus trabalhos', 'Publicar trabalhos e ver candidaturas.', '/app/meus-trabalhos'],
                ['Diretório', 'Encontrar e validar staff.', '/app/diretorio'],
                ['Canais', 'O teu canal de anúncios e a comunidade.', '/app/canais'],
                ['Ranking nacional', 'Quem mais trabalho validado tem.', '/app/ranking']].map(([t, sub, to]) => (
                <button key={to} onClick={() => navigate(to)} style={{ ...S.card, borderRadius: 16, padding: '15px 17px', display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', cursor: 'pointer' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', font: "600 15px/1.2 'Public Sans', sans-serif", letterSpacing: '-.02em', color: 'var(--text)' }}>{t}</span>
                    <span style={{ display: 'block', font: "400 12px/1.3 'Public Sans', sans-serif", color: 'var(--text-3)', marginTop: 4 }}>{sub}</span>
                  </span>
                  <span style={{ font: "400 16px/1 'Public Sans', sans-serif", color: 'var(--text-3)', flex: 'none' }}>→</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <TabBar tabs={isWorker ? TABS : TABS_COMPANY} navigate={navigate} />
    </div>
  );
}
