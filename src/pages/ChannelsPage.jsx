import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { TOPIC_CHANNELS, ensureTopicChannel, ensureCompanyChannel, listChannels, subscribePosts, sendPost } from '../services/channelsService';
import { MONO, brandText } from '../ui';

export default function ChannelsPage() {
  const { user, profile } = useAuth();
  const [channels, setChannels] = useState([]);
  const [current, setCurrent] = useState('t-geral');
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    (async () => {
      // garante os canais de tema + o canal da própria empresa
      await Promise.all(TOPIC_CHANNELS.map(([slug, name]) => ensureTopicChannel(slug, name).catch(() => {})));
      if (profile?.kind === 'company') await ensureCompanyChannel(user.uid, profile.name).catch(() => {});
      setChannels(await listChannels().catch(() => []));
    })();
  }, [user?.uid, profile?.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => subscribePosts(current, setPosts), [current]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [posts.length]);

  const cur = channels.find(c => c.id === current);
  const canPost = cur?.type === 'topic' || (cur?.type === 'company' && cur?.companyId === user?.uid);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    try {
      await sendPost(current, { text: t, authorId: user.uid, authorName: profile?.name || '—', authorKind: profile?.kind || 'worker' });
    } catch { setText(t); alert('Sem permissão para publicar neste canal.'); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>← Início</Link>
      </header>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(150px, 220px) 1fr', minHeight: 0 }}>
        {/* lista de canais */}
        <aside style={{ borderRight: '1px solid var(--border)', padding: '14px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ font: "700 10px/1 'Public Sans', sans-serif", letterSpacing: '.1em', color: 'var(--text-4)', padding: '6px 10px 8px' }}>CANAIS</div>
          {channels.filter(c => c.type === 'topic').map(c => (
            <button key={c.id} onClick={() => setCurrent(c.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: c.id === current ? 'var(--card)' : 'none', border: 'none', borderRadius: 8, padding: '9px 10px', font: `${c.id === current ? 600 : 400} 13px/1 'Public Sans', sans-serif`, color: c.id === current ? 'var(--text)' : 'var(--text-3)' }}>{c.name}</button>
          ))}
          <div style={{ font: "700 10px/1 'Public Sans', sans-serif", letterSpacing: '.1em', color: 'var(--text-4)', padding: '18px 10px 8px' }}>EMPRESAS</div>
          {channels.filter(c => c.type === 'company').map(c => (
            <button key={c.id} onClick={() => setCurrent(c.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: c.id === current ? 'var(--card)' : 'none', border: 'none', borderRadius: 8, padding: '9px 10px', font: `${c.id === current ? 600 : 400} 13px/1 'Public Sans', sans-serif`, color: c.brandColor ? brandText(c.brandColor) : 'var(--gold)' }}>▸ {c.name}</button>
          ))}
        </aside>
        {/* feed */}
        <main style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ font: "700 14px/1 'Public Sans', sans-serif" }}>{cur?.name || '…'}</span>
            <span style={{ font: "400 11px/1 'Public Sans', sans-serif", color: 'var(--text-4)' }}>
              {cur?.type === 'company' ? 'canal de anúncios · só a empresa publica' : 'canal de tema · toda a gente pode escrever'}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 15 }}>
            {posts.length === 0 && <p style={{ color: 'var(--text-5)', fontSize: 13 }}>Sem mensagens ainda — sê a primeira pessoa a escrever.</p>}
            {posts.map(p => (
              <div key={p.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                  <span style={{ font: "700 13px/1 'Public Sans', sans-serif", color: p.authorKind === 'company' ? 'var(--gold)' : 'var(--text)' }}>{p.authorName}</span>
                  <span style={{ font: `400 10px/1 ${MONO}`, color: 'var(--text-4)' }}>{p.createdAt ? new Date(p.createdAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                <div style={{ font: "400 13px/1.55 'Public Sans', sans-serif", color: 'var(--text-2)', marginTop: 5, whiteSpace: 'pre-wrap' }}>{p.text}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {canPost ? (
            <div style={{ display: 'flex', gap: 9, padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={`Mensagem para ${cur?.name || 'o canal'}…`} style={{ flex: 1, borderRadius: 12 }} />
              <button onClick={send} disabled={!text.trim()}
                style={{ font: "700 13px/1 'Public Sans', sans-serif", color: '#0A0A0B', background: 'var(--text)', border: 'none', borderRadius: 12, padding: '14px 22px', opacity: text.trim() ? 1 : 0.5 }}>Enviar</button>
            </div>
          ) : (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-4)' }}>
              Canal de anúncios — só a empresa publica aqui.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
