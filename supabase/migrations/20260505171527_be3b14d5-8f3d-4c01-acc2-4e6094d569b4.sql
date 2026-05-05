CREATE TABLE public.participantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  valor_doado NUMERIC NOT NULL CHECK (valor_doado > 0),
  numeros_rifa TEXT NOT NULL,
  numeros_array INTEGER[] NOT NULL,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode ver participantes"
ON public.participantes FOR SELECT
USING (true);

CREATE POLICY "Qualquer pessoa pode cadastrar"
ON public.participantes FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_participantes_numeros ON public.participantes USING GIN (numeros_array);
CREATE INDEX idx_participantes_data ON public.participantes (data_cadastro DESC);

-- Função para impedir números duplicados
CREATE OR REPLACE FUNCTION public.check_numeros_unicos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.participantes
    WHERE numeros_array && NEW.numeros_array
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Um ou mais números já estão reservados';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_numeros_unicos
BEFORE INSERT ON public.participantes
FOR EACH ROW EXECUTE FUNCTION public.check_numeros_unicos();