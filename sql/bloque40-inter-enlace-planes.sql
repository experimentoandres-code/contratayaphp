-- El botón del interstitial de mejoras Pro abre el cuadro de planes.

update public.interstitials
   set enlace = 'planes'
 where titulo = 'Varias mejoras. El Pro ahora rinde más.';
