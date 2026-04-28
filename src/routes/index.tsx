import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Heart,
  Loader2,
  Phone,
  User,
  DollarSign,
  Hash,
  Sparkles,
  Trophy,
  Calendar,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  cadastrarParticipante,
  listarParticipantes,
  type Participante,
} from "@/server/rifa.functions";

const TOTAL_NUMEROS = 200;
const VALOR_POR_NUMERO = 10;
const PREMIO = 150;
const DATA_SORTEIO = "28/06/2026";
const CHAVE_PIX = "34992448864";
const NOME_PIX = "VICTOR DIAS";

export const Route = createFileRoute("/")({
  component: RifaPage,
  head: () => ({
    meta: [
      { title: "Rifa Solidária — Em prol de Maria Luci" },
      {
        name: "description",
        content:
          "Participe da Rifa Solidária da Maria Luci. R$ 10,00 por número, prêmio de R$ 150,00 via PIX. Sorteio em 28/06/2026.",
      },
      { property: "og:title", content: "Rifa Solidária — Maria Luci" },
      {
        property: "og:description",
        content:
          "Ajude Maria Luci no tratamento urgente de visão. R$ 10,00 por número.",
      },
    ],
  }),
});

function maskPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
        [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`]
          .filter(Boolean)
          .join(""),
      )
      .trim();
  }
  return d
    .replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3")
    .replace(/-$/, "");
}

function parseNumeros(s: string): number[] {
  return Array.from(
    new Set(
      s
        .split(/[,\s]+/)
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ).sort((a, b) => a - b);
}

function formatBRL(v: number | string) {
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function RifaPage() {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const res = await listarParticipantes();
    if (res.ok) setParticipantes(res.participantes);
    else if (res.erro)
      toast.error("Erro ao carregar lista", { description: res.erro });
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const numerosOcupados = useMemo(() => {
    const set = new Set<number>();
    participantes.forEach((p) =>
      parseNumeros(String(p.numerosRifa ?? "")).forEach((n) => set.add(n)),
    );
    return set;
  }, [participantes]);

  const valorTotal = selecionados.size * VALOR_POR_NUMERO;
  const totalArrecadado = numerosOcupados.size * VALOR_POR_NUMERO;

  function toggleNumero(n: number) {
    if (numerosOcupados.has(n)) return;
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(CHAVE_PIX);
      setCopiado(true);
      toast.success("Chave PIX copiada!");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || nome.trim().length < 2) {
      toast.error("Informe o nome completo");
      return;
    }
    if (telefone.replace(/\D/g, "").length < 10) {
      toast.error("Telefone inválido");
      return;
    }
    if (selecionados.size === 0) {
      toast.error("Selecione pelo menos um número");
      return;
    }
    const numerosArr = Array.from(selecionados).sort((a, b) => a - b);
    const conflito = numerosArr.filter((n) => numerosOcupados.has(n));
    if (conflito.length) {
      toast.error("Números já ocupados", { description: conflito.join(", ") });
      return;
    }

    setEnviando(true);
    const res = await cadastrarParticipante({
      data: {
        nome: nome.trim(),
        telefone: telefone.trim(),
        valorDoado: valorTotal,
        numerosRifa: numerosArr.join(", "),
      },
    });
    setEnviando(false);

    if (res.ok) {
      toast.success("Cadastro realizado! 💖", {
        description: `Faça o PIX de ${formatBRL(valorTotal)} para ${NOME_PIX}.`,
      });
      setNome("");
      setTelefone("");
      setSelecionados(new Set());
      carregar();
    } else {
      toast.error("Não foi possível cadastrar", { description: res.erro });
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundImage: "var(--gradient-soft)" }}
    >
      <Toaster richColors position="top-center" />

      <header
        className="relative overflow-hidden text-primary-foreground"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <div className="absolute inset-0 opacity-20">
          <Heart className="absolute left-6 top-6 h-12 w-12 fill-current" />
          <Sparkles className="absolute right-8 top-10 h-8 w-8" />
          <Heart className="absolute bottom-8 right-12 h-10 w-10 fill-current" />
          <Sparkles className="absolute bottom-12 left-10 h-6 w-6" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-12 text-center md:py-16">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Heart className="h-8 w-8 fill-current" />
          </div>
          <p className="text-sm font-medium uppercase tracking-widest opacity-90">
            Rifa Solidária
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-5xl">
            Da Maria Luci 💖
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed opacity-95 md:text-base">
            Ela precisa fazer um <strong>tratamento urgente de visão</strong>,
            pois irá perder totalmente a visão. Sua ajuda pode devolver a
            visão e transformar a vida da Maria Luci!
          </p>
          <p className="mt-3 text-base font-semibold md:text-lg">
            💕 Contamos com a solidariedade de todos! 💕
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-6 md:-mt-10">
        {/* Info cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard
            icon={<DollarSign className="h-5 w-5" />}
            label="VALOR"
            value={formatBRL(VALOR_POR_NUMERO)}
            sub="por número"
          />
          <InfoCard
            icon={<Trophy className="h-5 w-5" />}
            label="PREMIAÇÃO"
            value={formatBRL(PREMIO)}
            sub="no PIX"
          />
          <InfoCard
            icon={<Calendar className="h-5 w-5" />}
            label="SORTEIO"
            value={DATA_SORTEIO}
            sub="via PIX"
          />
        </div>

        {/* PIX */}
        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <CardContent className="flex flex-col items-center gap-3 p-5 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Chave PIX
              </p>
              <p className="text-lg font-bold text-foreground">{NOME_PIX}</p>
              <p className="font-mono text-base text-muted-foreground">
                {CHAVE_PIX}
              </p>
            </div>
            <Button
              onClick={copiarPix}
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              {copiado ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" /> Copiar chave
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Participantes"
            value={String(participantes.length)}
            icon={<User className="h-5 w-5" />}
          />
          <StatCard
            label="Números vendidos"
            value={`${numerosOcupados.size} / ${TOTAL_NUMEROS}`}
            icon={<Hash className="h-5 w-5" />}
          />
          <StatCard
            label="Total arrecadado"
            value={formatBRL(totalArrecadado)}
            icon={<Sparkles className="h-5 w-5" />}
          />
        </div>

        {/* Grade de números */}
        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader>
            <CardTitle className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <span className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" />
                Escolha seus números
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                Clique para selecionar
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Legenda cor="bg-card border border-border" label="Disponível" />
              <Legenda cor="bg-primary text-primary-foreground" label="Selecionado" />
              <Legenda cor="bg-muted text-muted-foreground line-through" label="Ocupado" />
            </div>

            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 md:gap-1.5">
              {Array.from({ length: TOTAL_NUMEROS }, (_, i) => i + 1).map((n) => {
                const ocupado = numerosOcupados.has(n);
                const selecionado = selecionados.has(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleNumero(n)}
                    disabled={ocupado}
                    className={cn(
                      "aspect-square rounded-md border text-[11px] font-semibold tabular-nums transition-all sm:text-sm",
                      ocupado &&
                        "cursor-not-allowed border-border bg-muted text-muted-foreground line-through opacity-70",
                      !ocupado &&
                        !selecionado &&
                        "border-border bg-card text-foreground hover:border-primary hover:bg-primary/10",
                      selecionado &&
                        "scale-105 border-primary bg-primary text-primary-foreground shadow-md",
                    )}
                  >
                    {String(n).padStart(2, "0")}
                  </button>
                );
              })}
            </div>

            {selecionados.size > 0 && (
              <div className="mt-5 flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    Você selecionou {selecionados.size}{" "}
                    {selecionados.size === 1 ? "número" : "números"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Array.from(selecionados)
                      .sort((a, b) => a - b)
                      .map((n) => (
                        <Badge
                          key={n}
                          className="bg-primary text-primary-foreground"
                        >
                          {String(n).padStart(2, "0")}
                        </Badge>
                      ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatBRL(valorTotal)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário */}
        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 fill-current text-primary" />
              Seus dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    className="pl-9"
                    maxLength={120}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(maskPhone(e.target.value))}
                    placeholder="(34) 99244-8864"
                    className="pl-9"
                    inputMode="tel"
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={enviando || selecionados.size === 0}
                  className="w-full font-semibold text-primary-foreground hover:opacity-95"
                  style={{
                    backgroundImage: "var(--gradient-primary)",
                    boxShadow: "var(--shadow-elegant)",
                  }}
                >
                  {enviando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Heart className="mr-2 h-4 w-4 fill-current" />
                      {selecionados.size === 0
                        ? "Selecione números acima"
                        : `Reservar ${selecionados.size} ${
                            selecionados.size === 1 ? "número" : "números"
                          } — ${formatBRL(valorTotal)}`}
                    </>
                  )}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Após reservar, faça o PIX de{" "}
                  <strong>{formatBRL(valorTotal || VALOR_POR_NUMERO)}</strong>{" "}
                  para <strong>{NOME_PIX}</strong> ({CHAVE_PIX}).
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Participantes */}
        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Participantes
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {participantes.length} cadastrados
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : participantes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não há participantes. Seja o primeiro! 💖
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {participantes
                  .slice()
                  .reverse()
                  .map((p, i) => (
                    <li
                      key={i}
                      className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground">{p.nome}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Badge
                          variant="outline"
                          className="border-primary/30 text-primary"
                        >
                          {formatBRL(p.valorDoado)}
                        </Badge>
                        <div className="flex flex-wrap gap-1">
                          {parseNumeros(String(p.numerosRifa ?? "")).map((n) => (
                            <Badge
                              key={n}
                              className="bg-primary/10 text-primary hover:bg-primary/15"
                            >
                              {String(n).padStart(2, "0")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          💖 Cada número comprado é um ato de amor! Contamos com você 💖
        </p>
      </main>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card style={{ boxShadow: "var(--shadow-card)" }}>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-primary-foreground"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            {label}
          </p>
          <p className="text-xl font-extrabold leading-tight text-foreground">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card style={{ boxShadow: "var(--shadow-card)" }}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block h-4 w-4 rounded", cor)} />
      {label}
    </span>
  );
}
