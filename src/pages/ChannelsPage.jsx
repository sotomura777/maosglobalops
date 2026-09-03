import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { TOPIC_CHANNELS, ensureTopicChannel, ensureCompanyChannel, listChannels, subscribePosts, sendPost } from '../services/channelsService';

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
        <Link to="/app" style={{ color: 'var(--text-2)', textDecoration: 'none' }}>← Início</Link>
      </header>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 0 }}>
        {/* lista de canais */}
        <aside style={{ borderRight: '1px solid var(--border)', padding: 12, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 700, letterSpacing: '0.06em', margin: '6px 0 8px' }}>CANAIS</div>
          {channels.filter(c => c.type === 'topic').map(c => (
            <button key={c.id} onClick={() => setCurrent(c.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: c.id === current ? 'var(--card)' : 'none', border: 'none', borderRadius: 6, color: c.id === current ? 'var(--text)' : 'var(--text-3)', padding: '8px 10px', fontSize: 14 }}>{c.name}</button>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 700, letterSpacing: '0.06em', margin: '16px 0 8px' }}>EMPRESAS</div>
          {channels.filter(c => c.type === 'company').map(c => (
            <button key={c.id} onClick={() => setCurrent(c.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: c.id === current ? 'var(--card)' : 'none', border: 'none', borderRadius: 6, color: c.id === current ? 'var(--accent)' : 'var(--text-3)', padding: '8px 10px', fontSize: 14 }}>▸ {c.name}</button>
          ))}
        </aside>
        {/* feed */}
        <main style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
            {cur?.name || '…'}
            {cur?.type === 'company' && <span style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 400, marginLeft: 8 }}>só a empresa publica</span>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
            {posts.length === 0 && <p style={{ color: 'var(--text-4)', fontSize: 14 }}>Sem mensagens ainda — sê a primeira pessoa a escrever.</p>}
            {posts.map(p => (
              <div key={p.id} style={{ marginBottom: 14 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: p.authorKind === 'company' ? 'var(--accent)' : 'var(--text)' }}>{p.authorName}</span>
                <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 8 }}>{p.createdAt ? new Date(p.createdAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{p.text}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {canPost ? (
            <div style={{ display: 'flex', gap: 8, padding: 14, borderTop: '1px solid var(--border)' }}>
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={`Mensagem para ${cur?.name || 'o canal'}…`} style={{ flex: 1 }} />
              <button onClick={send} disabled={!text.trim()}
                style={{ background: 'var(--accent)', color: '#08222E', fontWeight: 700, border: 'none', borderRadius: 'var(--radius)', padding: '0 20px', opacity: text.trim() ? 1 : 0.5 }}>Enviar</button>
            </div>
          ) : (
            <div style={{ padding: 14, borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-4)' }}>
              Canal de anúncios — só a empresa publica aqui.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
