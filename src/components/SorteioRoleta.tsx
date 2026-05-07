import { useMemo, useRef, useState } from "react";
import { Trophy, Play, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Participante } from "@/server/rifa.functions";

type Bilhete = { numero: number; participante: Participante };

type Vencedor = {
  numero: number;
  participante: Participante;
  data: string;
};

function parseNumeros(s: string): number[] {
  return Array.from(
    new Set(
      s
        .split(/[,\s]+/)
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  );
}

// CSPRNG — sorteio justo (não usa Math.random)
function sortearIndice(max: number): number {
  const buf = new Uint32Array(1);
  const limite = Math.floor(0xffffffff / max) * max;
  let v: number;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limite);
  return v % max;
}

export function SorteioRoleta({ participantes }: { participantes: Participante[] }) {
  const [girando, setGirando] = useState(false);
  const [atual, setAtual] = useState<Bilhete | null>(null);
  const [vencedor, setVencedor] = useState<Vencedor | null>(null);
  const [historico, setHistorico] = useState<Vencedor[]>([]);
  const timeoutRef = useRef<number | null>(null);

  const bilhetes = useMemo<Bilhete[]>(() => {
    const lista: Bilhete[] = [];
    for (const p of participantes) {
      for (const n of parseNumeros(p.numerosRifa)) {
        lista.push({ numero: n, participante: p });
      }
    }
    return lista.sort((a, b) => a.numero - b.numero);
  }, [participantes]);

  const sortear = () => {
    if (!bilhetes.length || girando) return;
    setVencedor(null);
    setGirando(true);

    const idxFinal = sortearIndice(bilhetes.length);
    const escolhido = bilhetes[idxFinal];

    const duracao = 4500; // ms
    const inicio = performance.now();

    const tick = () => {
      const t = (performance.now() - inicio) / duracao;
      if (t >= 1) {
        setAtual(escolhido);
        setGirando(false);
        const venc: Vencedor = {
          numero: escolhido.numero,
          participante: escolhido.participante,
          data: new Date().toISOString(),
        };
        setVencedor(venc);
        setHistorico((h) => [venc, ...h]);
        return;
      }
      // ease-out: começa rápido, desacelera
      const eased = 1 - Math.pow(1 - t, 3);
      const intervalo = 40 + eased * 260; // 40ms -> 300ms
      const idx = sortearIndice(bilhetes.length);
      setAtual(bilhetes[idx]);
      timeoutRef.current = window.setTimeout(tick, intervalo);
    };

    tick();
  };

  const resetar = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setGirando(false);
    setAtual(null);
    setVencedor(null);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Sorteio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bilhetes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum número cadastrado para sortear.
          </p>
        ) : (
          <>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>Bilhetes na urna: <strong className="text-foreground">{bilhetes.length}</strong></span>
              <span>Participantes: <strong className="text-foreground">{participantes.length}</strong></span>
              <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Sorteio criptográfico (CSPRNG)</span>
            </div>

            <div
              className={`relative rounded-xl border-2 ${
                vencedor ? "border-primary" : "border-border"
              } bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center overflow-hidden transition-colors`}
            >
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                {girando ? "Girando..." : vencedor ? "🎉 Vencedor 🎉" : "Pronto para sortear"}
              </div>
              <div
                className={`text-6xl sm:text-7xl font-bold tabular-nums transition-transform ${
                  girando ? "scale-95 opacity-90" : "scale-100"
                } ${vencedor ? "text-primary" : "text-foreground"}`}
                style={{ minHeight: "1.1em" }}
              >
                {atual ? String(atual.numero).padStart(2, "0") : "--"}
              </div>
              <div className="mt-3 text-sm sm:text-base font-medium min-h-[1.5em]">
                {atual ? atual.participante.nome : <span className="text-muted-foreground">—</span>}
              </div>
              {vencedor && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {vencedor.participante.telefone}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-center">
              <Button onClick={sortear} disabled={girando} size="lg">
                <Play className="h-4 w-4 mr-1" />
                {vencedor ? "Sortear novamente" : "Iniciar sorteio"}
              </Button>
              {(vencedor || atual) && !girando && (
                <Button variant="outline" onClick={resetar} size="lg">
                  <RotateCcw className="h-4 w-4 mr-1" /> Limpar
                </Button>
              )}
            </div>

            {historico.length > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Histórico desta sessão
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setHistorico([])}>
                    Limpar histórico
                  </Button>
                </div>
                <div className="space-y-1">
                  {historico.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={i === 0 ? "default" : "secondary"}>
                          {String(v.numero).padStart(2, "0")}
                        </Badge>
                        <span className="font-medium">{v.participante.nome}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.data).toLocaleTimeString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
