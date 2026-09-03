-- Interstitial de casa para profesionales. Rota con los demás de casa.
-- Si el insert falla por un nombre de columna, cargalo a mano en Creativos.

insert into public.interstitials (
  activo, audiencia, fondo, tinta, boton_fondo, boton_tinta,
  rotulo, titulo, cuerpo, boton, enlace
)
select
  true,
  'pro',
  'linear-gradient(160deg, #F0A63A 0%, #D97706 55%, #9A4E10 100%)',
  '#1A0F02',
  '#1A0F02',
  '#F5EFE4',
  'Contratá Ya',
  'Varias mejoras. El Pro ahora rinde más.',
  'Actualizamos la app para que se labure más fácil. En el Plan Pro ahora tenés galería de fotos de tus trabajos y el link de tus redes en la ficha del mazo, te publicás en todas las localidades al mismo tiempo, salís primero en tu pueblo, te avisamos al toque cuando entra un pedido de tu oficio y armás un presupuesto de mano de obra por escrito en el match. También hay un juego, Jugá, para pasar el rato mientras esperás un laburo. Si no tenés Pro, llegá a 10.000 en una sola partida y te lo activamos un mes, sin cargo.',
  'Ver el plan Pro',
  'perfil'
where not exists (
  select 1 from public.interstitials
  where titulo = 'Varias mejoras. El Pro ahora rinde más.'
);
