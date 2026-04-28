import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycby_YyidhG0bA_ixbozEYRlwkPvKgW0W2MhYSFnfAK2kH1_Tkg0mfM27Rgj7EiJDY7-T/exec";

export type Participante = {
  nome: string;
  telefone: string;
  valorDoado: number | string;
  numerosRifa: string;
  dataCadastro?: string;
};

export const listarParticipantes = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const res = await fetch(WEBHOOK_URL, { method: "GET" });
      if (!res.ok) {
        return { ok: false, participantes: [] as Participante[], erro: `HTTP ${res.status}` };
      }
      const data = (await res.json()) as { ok: boolean; participantes?: Participante[]; erro?: string };
      return {
        ok: !!data.ok,
        participantes: data.participantes ?? [],
        erro: data.erro,
      };
    } catch (err) {
      console.error("listarParticipantes error", err);
      return { ok: false, participantes: [] as Participante[], erro: String(err) };
    }
  },
);

const cadastroSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  telefone: z.string().trim().min(8).max(40),
  valorDoado: z.number().positive().max(1_000_000),
  numerosRifa: z.string().trim().min(1).max(500),
});

export const cadastrarParticipante = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cadastroSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        redirect: "follow",
      });
      const text = await res.text();
      let json: { ok?: boolean; erro?: string } = {};
      try {
        json = JSON.parse(text);
      } catch {
        return { ok: false, erro: "Resposta inválida do servidor" };
      }
      return { ok: !!json.ok, erro: json.erro };
    } catch (err) {
      console.error("cadastrarParticipante error", err);
      return { ok: false, erro: String(err) };
    }
  });
