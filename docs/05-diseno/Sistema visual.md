# Sistema visual

Fuente: GUÍA §1 y `public/css/tokens.css`. Paleta completa en [[Marca e identidad]].

## Tokens

`tokens.css` es el contrato de toda la UI (landing, app, admin, canje). Ahí viven color, radio, sombra, spacing y la regla que salvó la demo:

```css
[hidden] { display: none !important; }
```

Sin eso, cualquier `display: flex` de una clase pisa el atributo `hidden` y una capa invisible mata los toques.

## Superficies

| Archivo | Superficie |
|---|---|
| `tokens.css` | Sistema |
| `landing.css` | Marketing + riel |
| `app.css` | Mazo, chat, perfil |
| `admin.css` | Panel desktop-first |
| `canje.css` | Mostrador, una columna |
| `legal.css` | Términos y privacidad |

## Accesibilidad (declarada en la GUÍA)

- Foco de teclado visible
- Contraste alto (cal sobre asfalto)
- Respeta `prefers-reduced-motion`
- Áreas de toque ≥ 44 px
- Textos alternativos en íconos

## Bug de cascada del riel

La regla que reserva 220 px a la izquierda tiene que ir **después** del padding de las secciones. Si no, el texto se monta sobre los nombres de las localidades. Quedó al final de `landing.css` a propósito.

## Este vault

El visor de `docs/index.html` usa una piel **tipo Obsidian** (fondo #1e1e1e, acento violeta) con ámbar de Contratá Ya solo en estados (sin guardar, foco). No reutiliza `tokens.css` para no mezclar la app con la documentación.
