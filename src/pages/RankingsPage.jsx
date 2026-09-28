import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import { getRanking, getReputation } from "../marketplace/service";
import { Heading, Empty, ErrorBox } from "../marketplace/Layout";
import { timestampMillis } from "../marketplace/model";

// Ranking da GlobalOps, calculado no servidor todas as noites (functions/ranking.js).
export default function RankingsPage() {
  const { user, profile } = useAuth();
  const [ranking, setRanking] = useState(null);
  const [mine, setMine] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getRanking()
      .then(setRanking)
      .catch(() => setError("Não foi possível carregar o ranking."));
    getReputation(user.uid)
      .then((r) => setMine(r.rank || null))
      .catch(() => {});
  }, [user.uid]);
  const entries = ranking?.entries || [];
  const inTop = entries.some((e) => e.uid === user.uid);
  const updated = timestampMillis(ranking?.updatedAt);
  return (
    <>
      <Heading eyebrow="GlobalOps" title="Ranking">
        Quem mais trabalha, e bem, na GlobalOps. Só conta trabalho feito ou
        confirmado aqui, com empresas validadas.
      </Heading>
      <ErrorBox>{error}</ErrorBox>
      {ranking === null && !error ? (
        <p className="subtle">A carregar…</p>
      ) : entries.length === 0 ? (
        <Empty title="O ranking ainda está vazio">
          Aparece quando as empresas validadas concluírem os primeiros
          trabalhos com profissionais de perfil público.
        </Empty>
      ) : (
        <ol className="ranking">
          {entries.map((e, i) => (
            <li key={e.uid} className={`ranking-row ${i < 3 ? "top" : ""} ${e.uid === user.uid ? "me" : ""}`}>
              <span className="ranking-pos">{i + 1}</span>
              <div className="ranking-who">
                <Link to={`/app/profissionais/${e.uid}`}>{e.name}</Link>
                {e.uid === user.uid && <span className="subtle"> — tu</span>}
                <p className="subtle">
                  {[e.headline, e.district].filter(Boolean).join(" · ") || "Profissional"}
                </p>
              </div>
              <div className="ranking-score">
                <strong>{e.score.toLocaleString("pt-PT")} pts</strong>
                <small>
                  {e.jobs} {e.jobs === 1 ? "trabalho" : "trabalhos"} · {Math.round(e.hours)} h
                  {e.rating ? ` · ★ ${e.rating.toLocaleString("pt-PT")}` : ""}
                </small>
              </div>
            </li>
          ))}
        </ol>
      )}
      {mine && !inTop && (
        <div className="ranking-row me" style={{ marginTop: 14 }}>
          <span className="ranking-pos">{mine.position}</span>
          <div className="ranking-who">
            <strong>A tua posição</strong>
            <p className="subtle">em {mine.of} profissionais</p>
          </div>
          <div className="ranking-score">
            <strong>{mine.score.toLocaleString("pt-PT")} pts</strong>
          </div>
        </div>
      )}
      {!mine && ranking !== null && profile?.kind === "worker" && (
        <p className="subtle" style={{ marginTop: 14 }}>
          Ainda não estás no ranking. Entra quando concluíres um trabalho com uma
          empresa validada e tiveres o perfil público.
        </p>
      )}
      <div className="panel" style={{ marginTop: 20 }}>
        <h3 className="section-title">Como é calculado</h3>
        <ul className="stack subtle" style={{ paddingLeft: 18, listStyle: "disc" }}>
          <li>20 pontos por cada trabalho verificado e 1 ponto por cada hora.</li>
          <li>
            Contam os trabalhos concluídos na GlobalOps e os trabalhos passados
            confirmados, sempre com empresas validadas.
          </li>
          <li>Cada falta tira 15% e cada cancelamento a menos de 24 horas tira 5%.</li>
          <li>Em caso de empate, ganha a melhor avaliação média.</li>
          <li>Só entram perfis públicos.</li>
        </ul>
        {updated > 0 && (
          <p className="subtle" style={{ marginTop: 10 }}>
            Atualizado a {new Date(updated).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.
          </p>
        )}
      </div>
    </>
  );
}
