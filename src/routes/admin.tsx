import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, LogOut, Download, Lock, Users, DollarSign, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { listarParticipantes, type Participante } from "@/server/rifa.functions";

const ADMIN_PASSWORD = "xvpc7gn8";
const STORAGE_KEY = "rifa_admin_auth";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin — Rifa" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthed(sessionStorage.getItem(STORAGE_KEY) === "1");
    }
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      {authed ? (
        <Dashboard onLogout={() => {
          sessionStorage.removeItem(STORAGE_KEY);
          setAuthed(false);
        }} />
      ) : (
        <Login onSuccess={() => {
          sessionStorage.setItem(STORAGE_KEY, "1");
          setAuthed(true);
        }} />
      )}
    </div>
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (pwd === ADMIN_PASSWORD) {
        onSuccess();
      } else {
        toast.error("Senha incorreta");
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Área Administrativa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pwd">Senha</Label>
              <Input
                id="pwd"
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                autoFocus
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const res = await listarParticipantes();
    if (res.ok) setParticipantes(res.participantes);
    else toast.error(res.erro ?? "Erro ao carregar");
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const stats = useMemo(() => {
    const total = participantes.reduce((s, p) => s + Number(p.valorDoado || 0), 0);
    const numeros = participantes.reduce(
      (s, p) => s + p.numerosRifa.split(",").filter((x) => x.trim()).length,
      0,
    );
    return { total, numeros, qtd: participantes.length };
  }, [participantes]);

  const exportarCSV = () => {
    const header = "Nome,Telefone,Valor Doado,Números,Data Cadastro\n";
    const rows = participantes
      .map((p) => {
        const data = p.dataCadastro ? new Date(p.dataCadastro).toLocaleString("pt-BR") : "";
        const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
        return [
          esc(p.nome),
          esc(p.telefone),
          esc(`R$ ${Number(p.valorDoado).toFixed(2)}`),
          esc(p.numerosRifa),
          esc(data),
        ].join(",");
      })
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rifa-participantes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo exportado!");
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Cadastros da rifa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCSV} disabled={!participantes.length}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<Users className="h-5 w-5" />} label="Participantes" value={String(stats.qtd)} />
        <StatCard icon={<Hash className="h-5 w-5" />} label="Números vendidos" value={String(stats.numeros)} />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total arrecadado"
          value={`R$ ${stats.total.toFixed(2)}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de cadastros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : participantes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum cadastro ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Números</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantes.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{p.telefone}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">R$ {Number(p.valorDoado).toFixed(2)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-xs">{p.numerosRifa}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {p.dataCadastro ? new Date(p.dataCadastro).toLocaleString("pt-BR") : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
