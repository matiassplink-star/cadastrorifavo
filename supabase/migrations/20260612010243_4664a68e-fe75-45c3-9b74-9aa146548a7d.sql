-- 1) Remove políticas públicas e revoga GRANTs de anon/authenticated na tabela participantes.
--    Todas as leituras/inserts são feitas via server functions usando service_role,
--    portanto não há necessidade de expor a tabela ao público.
DROP POLICY IF EXISTS "Qualquer pessoa pode ver participantes" ON public.participantes;
DROP POLICY IF EXISTS "Qualquer pessoa pode cadastrar" ON public.participantes;

REVOKE ALL ON public.participantes FROM anon;
REVOKE ALL ON public.participantes FROM authenticated;
REVOKE ALL ON public.participantes FROM PUBLIC;

GRANT ALL ON public.participantes TO service_role;

-- 2) Função SECURITY DEFINER usada apenas como trigger — revoga EXECUTE público.
REVOKE EXECUTE ON FUNCTION public.check_numeros_unicos() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_numeros_unicos() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_numeros_unicos() FROM authenticated;