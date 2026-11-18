# Perfiles públicos de creadores y curadores — 17 noviembre 2026 (SHCWS-120)

Fase 3 de `docs/strategy.md`: una página propia para quien construye proyectos o cura listas,
con **solo lo que cada quien publica**. Migración `db/public-profiles.sql` (orden 57 en
`docs/database.md`), aplicada solo en `neondb`.

## Qué es

- `/c/<handle>` (es/en): nombre o alias, bio, enlaces, las fichas publicadas de la cuenta y
  sus listas públicas visibles (las de Comunidad: públicas y con 3 proyectos disponibles),
  menos las que la persona oculta en su perfil.
- **Apagado por defecto.** Sin fila en `public_profiles`, o con `active = false`, no hay
  página: el middleware responde un 404 real. Se activa en Ajustes → Perfil, tarjeta
  «Perfil público» (`#perfil-publico`).
- Nunca muestra correo, id de cuenta, empresa, foto, guardados, notas ni actividad privada
  (§19, §23). El nombre del perfil lo escribe la persona; el formulario solo lo sugiere a
  partir del nombre de la cuenta, y nada es público hasta guardar con el perfil activo.
- Lo nuevo aparece por defecto: una ficha que se publica o una lista que se vuelve visible
  después de activar el perfil sale en él, salvo que la persona la desmarque. Desmarcar no la
  retira del catálogo ni de Comunidad.
- `/fundadores` es el directorio: perfiles visibles que muestran al menos una ficha
  publicada, del más reciente al más antiguo, 24 por página. Con él existe un índice real, así
  que el enlace «Directorio de founders» de la navbar dejó de estar oculto
  (`src/lib/navigation-destinations.ts`). Sin perfiles, muestra un estado vacío honesto.

## Handle

- 3 a 30 caracteres: minúsculas ASCII, dígitos y guiones entre palabras (CHECK en la base y
  `src/lib/profiles/handle-shape.ts`). Lo que la persona escribe se normaliza
  («@Ana López_99» → `ana-lopez-99`) y la interfaz muestra el resultado y si está libre
  (`check-handle`).
- Reservados (`src/lib/profiles/handle.ts`): cualquier cosa que contenga «shwcs» o
  «showcase» con la misma regla que las firmas de listas (`reservedCurator()`, letras
  parecidas incluidas), páginas del sitio (`comunidad`, `soluciones`, `fundadores`…),
  roles de autoridad (`admin`, `soporte`, `moderador`, `oficial`, `verificado`…) y
  `opengraph-image`. Ops tiene una copia (`ops/src/lib/profiles.ts`);
  `tests/profiles.test.ts` comprueba que ambas listas sean iguales.
- **Cambiar el handle no rompe enlaces**: el anterior pasa a `profile_handle_history` y el
  middleware responde **301** al actual (mismo patrón que los slugs de fichas, SHCWS-101).
  Nadie más puede tomarlo mientras la cuenta exista; la persona puede recuperarlo. Máximo 10
  handles anteriores por cuenta (luego responde «demasiados cambios»). Otra capitalización
  (`/c/Ana-Lopez`) también responde 301 al handle en minúsculas.
- Cuando **ops fuerza** el cambio (suplantación, marca ajena), el anterior va a
  `profile_handle_blocks`: no redirige y nadie puede volver a usarlo (tampoco tras borrar la
  cuenta). Liberarlo es una operación manual en la base.
- Eliminar el perfil desde Ajustes borra el perfil, sus handles anteriores y quién lo sigue;
  fichas y listas no cambian.

## Enrutamiento y SEO

- `src/lib/routes.ts` acepta `c/<segmento>` con forma de handle (cualquier capitalización) y
  `fundadores`. `src/lib/profiles/routing.ts` decide en el middleware: página, 301 o 404, con
  los handles visibles en memoria (recarga como mucho cada minuto, o cada 15 s cuando ve un
  handle que no conoce). Un perfil recién activado puede tardar hasta 15 s en responder;
  uno apagado u oculto, hasta un minuto en pasar a 404 (mientras, la página consulta la base
  y muestra «no encontrado»). Sin base, todo va a la página.
- `noindex, follow` si el perfil no muestra ninguna ficha ni lista; el sitemap solo incluye
  perfiles visibles con contenido (`indexableProfiles()`), con `hreflang` es/en.
  `robots.ts` permite `/fundadores?page=`.
- JSON-LD `ProfilePage` con `mainEntity` `Person`: nombre, `@handle`, bio y `sameAs` con los
  enlaces que escribió la persona. Nada más.

## Enlaces hacia el perfil

Solo si la persona activó su perfil y este muestra el elemento:

- **Firma de sus listas públicas** (`/comunidad/<id>`): la firma enlaza al perfil y el botón
  «Seguir a {nombre}» sigue a la persona por su perfil en lugar de solo la firma.
- **Bloque «Quién está detrás» de sus fichas**: «Publicado en shwcs por {nombre}». Solo la
  cuenta dueña de la ficha; los creadores declarados en la ficha (§17) nunca se enlazan
  automáticamente a ninguna cuenta.

## Seguir un perfil

- `POST /api/follows` con `action: 'profile', handle` (alterna); `unfollow-profile` con el id
  propio del seguimiento, desde `/account/community`, aunque el perfil ya no se vea. El dueño
  no puede seguirse. La respuesta solo dice el estado de quien sigue.
- `profile_follows` y el mismo aviso semanal de lo que se sigue (`follow_notice()`,
  redefinida aquí; antes en `db/solution-updates.sql`): proyectos que la persona publica por
  **primera vez** (`profile_project_announcements`, un trigger al publicar; volver a aprobar
  una ficha no es noticia) y listas suyas que se vuelven visibles (trigger sobre
  `community_list_announcements`). Una lista que también llega por la firma seguida se cuenta
  una vez. Las fichas ya publicadas al aplicar la migración cuentan como anunciadas.
- Correo: entra en el resumen semanal existente («De los perfiles que sigues»), solo con
  `community_email` y correo verificado.
- `/account/community`: «Perfiles que sigues» y, en «Quién te sigue», cuántas personas siguen
  tu perfil público. Nunca quién; nadie más ve el número.

## Ops

En la ficha de cuenta (`/panel/cuentas/<id>?tab=comunidad`), tarjeta «Perfil público»:
estado, qué muestra, seguidores (número), handles anteriores. Acciones en
`POST /api/profiles`, cada una con motivo, bitácora y aviso al dueño en la misma sentencia:

- `hide` / `unhide` (cualquier miembro de ops): oculta con un motivo que el dueño lee en
  Ajustes. Fichas y listas siguen publicadas.
- `force_handle` (solo admin): handle nuevo con las reglas del producto; el anterior queda
  bloqueado.
- «Despublicar todo» de una cuenta ahora también oculta su perfil.

Ops nunca edita el nombre, la bio ni los enlaces: para eso está ocultar.

## Privacidad, exportación y eliminación

- Privacidad (es/en, «Privacidad transaccional y terceros»): qué publica el perfil, que está
  apagado por defecto, quién ve los seguidores, qué pasa con un handle anterior y la
  moderación. **Requiere revisión legal humana** como el resto del texto.
- `GET /api/account/export` incluye `publicProfile` (con handles anteriores y número de
  seguidores) y `following.profiles` (por handle, solo mientras el perfil se vea).
- Eliminar la cuenta borra el perfil en cascada; la lista de consecuencias lo dice con su
  enlace. Los handles bloqueados por ops no se liberan.

## Verificación

- `tests/profiles.test.ts`: normalización y reservados, copia de ops idéntica, validación
  del guardado (enlaces con las reglas de la ficha), decisión del middleware (404, 301 por
  handle anterior y por mayúsculas), correo semanal y frontera de origen/sesión.
  `tests/routes.test.ts` recorre la ruta nueva.
- Integración `APP_ORIGIN=http://localhost:3104 RUN_PROFILES_INTEGRATION=1 node tests/integration/profiles.cjs`
  (≈2 min, cuentas `@example.invalid`): apagado → 404 real; reservado y tomado; conflicto de
  versión; activo con fichas, lista, enlaces y JSON-LD; HTML y RSC sin correo, ids de cuenta
  ni nombre privado; ocultar una ficha; enlaces desde la lista y la ficha; directorio; seguir
  y no seguirse; aviso semanal al publicar y sin repetir; exportaciones; 301 tras renombrar;
  nadie toma el handle anterior; 404 al apagarlo; borrar el perfil.
- Moderación en ops probada contra el servidor de ops con un admin temporal: ocultar, mostrar,
  handle reservado rechazado, forzar handle con bloqueo, avisos, bitácora, 403 para
  `reviewer` y «Despublicar todo».

## Límites y pendientes

- El perfil toma sus fichas del catálogo en caché (`publicProducts`, 5 min); publicar desde
  ops ya invalida esa caché, así que en la práctica sale al momento.
- Sin foto pública ni verificación de identidad: el nombre es declarado.
- Sin búsqueda de perfiles en la paleta de ops ni lista de perfiles en `/panel/comunidad`.
- Sin reporte de perfiles desde el sitio: hoy se moderan desde ops por la cuenta.
- La exportación todavía no incluye las fichas que la cuenta sigue (SHCWS-24), ajeno a esta
  entrega.
