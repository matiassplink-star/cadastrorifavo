import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Participante = {
  nome: string;
  telefone: string;
  valorDoado: number | string;
  numerosRifa: string;
  dataCadastro?: string;
};

export const listarParticipantes = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data, error } = await supabaseAdmin
      .from("participantes")
      .select("nome, telefone, valor_doado, numeros_rifa, data_cadastro")
      .order("data_cadastro", { ascending: true });

    if (error) {
      console.error("listarParticipantes error", error);
      return { ok: false, participantes: [] as Participante[], erro: error.message };
    }

    const participantes: Participante[] = (data ?? []).map((r) => ({
      nome: r.nome,
      telefone: r.telefone,
      valorDoado: Number(r.valor_doado),
      numerosRifa: r.numeros_rifa,
      dataCadastro: r.data_cadastro ?? undefined,
    }));

    return { ok: true, participantes };
  },
);

const cadastroSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  telefone: z.string().trim().min(8).max(40),
  valorDoado: z.number().positive().max(1_000_000),
  numerosRifa: z.string().trim().min(1).max(2000),
});

export const cadastrarParticipante = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cadastroSchema.parse(input))
  .handler(async ({ data }) => {
    // Normaliza string "1, 2, 3" em array de inteiros
    const nums = Array.from(
      new Set(
        data.numerosRifa
          .split(/[,\s]+/)
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    );

    if (nums.length === 0) {
      return { ok: false, erro: "Informe ao menos um número válido." };
    }

    const { error } = await supabaseAdmin.from("participantes").insert({
      nome: data.nome,
      telefone: data.telefone,
      valor_doado: data.valorDoado,
      numeros_rifa: nums.join(", "),
      numeros_array: nums,
    });

    if (error) {
      console.error("cadastrarParticipante error", error);
      const msg = error.message.toLowerCase();
      if (msg.includes("já estão reservados") || msg.includes("reservados")) {
        return { ok: false, erro: "Número(s) já reservado(s) por outra pessoa. Atualize a página." };
      }
      return { ok: false, erro: error.message };
    }

    return { ok: true };
  });
