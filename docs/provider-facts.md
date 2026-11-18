# Dónde opera el proveedor y su trayectoria (SHCWS-56)

Estado: 17 de noviembre de 2026. Implementado y probado en local contra `neondb`; no
desplegado. Sin migración: los campos viven en el `jsonb` de `data`/`published_data`, como
los de §59.

## Campos (`SolutionData`, `src/lib/solutions/model.ts`)

Todos opcionales y declarados por el proyecto. Ninguno es obligatorio para enviar a revisión.

| Campo | Tipo | Regla |
| --- | --- | --- |
| `originCountry` | ISO 3166-1 alfa-2 | Validado con `Intl` (`src/lib/countries.ts`) |
| `serviceCountries` | lista ISO | **Tri-estado** (§54): ausente = sin contestar, `[]` = cualquier país |
| `billingCountries` | lista ISO | **Tri-estado**: donde emite factura o comprobante útil para el cliente |
| `currencies` | lista ISO 4217 | `src/lib/currencies.ts`; lista vacía se descarta |
| `supportLanguages` | lista ISO 639-1 | `src/lib/languages.ts` (nuevo, `Intl`); lista vacía se descarta |
| `supportHours` | texto ≤120 | En las palabras del proyecto |
| `paymentMethods` | lista cerrada | `solutionPaymentMethods` |
| `foundedYear` | entero 1900–2100 | Enviar exige que no sea posterior al año actual (`foundedYearInvalid`) |
| `teamSize` | rango cerrado | `solutionTeamSizes`; rangos, no cifras exactas |
| `customerCount` | rango cerrado | `solutionCustomerCounts` |
| `cases` | ≤4 `{client,problem,result,url?}` | client 100, problem/result 400, url 500; enviar exige cliente y resultado, URL HTTP(S) (`casesInvalid`) |

Los casos se publican **siempre** como «Declarado por el proyecto · el cliente aún no lo
confirma». `readSolutionData` descarta cualquier clave extra (un `confirmed: true` escrito por
el fundador no sobrevive). La confirmación por el cliente queda pendiente: necesita su propio
flujo y tabla, fuera de los datos que escribe el fundador.

Etiquetas en `src/lib/taxonomy.ts` (`localizedPaymentMethodOptions`,
`localizedTeamSizeOptions`, `localizedCustomerCountOptions`) y `src/lib/taxonomy-en.ts`.
`src/lib/solutions/provider.ts` (`providerRows`, `providerValues`) convierte los datos en filas
legibles para la ficha, el comparador y el Markdown: los tres dicen lo mismo y solo muestran
lo declarado.

## Editor

Dos tarjetas opcionales nuevas en «Hazla más fuerte» de la pantalla de revisión
(`src/lib/solutions/questions.ts`, `src/components/solutions/editor/provider-fields.tsx`),
nunca un paso obligatorio:

- **Dónde operas** (`markets`): país de origen, dónde atiende, dónde factura (cada uno con
  «Cualquier país» = `[]`), monedas, idiomas de soporte, horario y formas de pago.
- **Trayectoria y clientes** (`track`): año de fundación, personas en el equipo, clientes que
  atiende hoy y hasta cuatro casos.

Países, monedas e idiomas se eligen de un `<select>` nativo (los más usados primero) y se
muestran como pastillas que se pueden quitar: 250 países nunca se dibujan como chips. Las
opciones se construyen en el servidor (`countryPickerOptions`, `currencyOptions`,
`languageOptions`) y se pasan al editor, como ya se hacía con las monedas.

## Ficha pública y preview

`SolutionPresentation` añade «Dónde opera» (filas declaradas, nota «Datos declarados por el
proyecto») después de «Antes de decidir», y «Casos de clientes» como tarjetas después de la
evidencia. Sin datos, no aparece nada.

## Catálogo

- `publicProducts()` expone `serviceCountries`, `billingCountries` y `supportLanguages`
  (lo justo para filtrar; el resto no viaja al cliente).
- Ejes nuevos en `CategoryPageLayout` y en `placeProduct` (`src/lib/search/catalog-filter.ts`):
  - `pais` — **«Atiende y factura en»**: una ficha encaja si atiende *y* factura en el país
    (`marketFit`, `src/lib/search/facets.ts`). Declarar cierra la pregunta: una lista que deja
    fuera el país excluye; una de las dos sin contestar manda la ficha a «También podrían
    servir» con el motivo «No declaró dónde atiende o factura». `[]` encaja con cualquier país.
  - `idioma` — «Idioma de soporte»: sin declarar → «También podrían servir».
  - Opciones derivadas del resultado: solo los países nombrados explícitamente (`declaredMarkets`);
    una ficha de «cualquier país» encaja con todos sin convertir ~250 países en opciones.
- `CategoryPageLayout` ahora coloca cada ficha con `placeProduct`, la misma función que usan
  las alertas guardadas: antes duplicaba la lógica a mano. Las alertas aceptan `pais` e `idioma`
  (`legalValues` con `countryCodes()`/`languageCodes()`) y las leen de `published_data`.

**Listo cuando** se cumple así: un comprador de Colombia elige «Atiende y factura en: Colombia»
y ve en la rejilla principal solo las fichas que atienden y facturan ahí (o en cualquier país).

## Markdown y IA

- `/soluciones/<slug>.md` gana «Dónde opera» y «Casos de clientes declarados por el proyecto
  (sin confirmar por el cliente)»; nunca el correo privado. `llms.txt` no cambia.
- La ficha con IA (`src/lib/solutions/site-draft.ts`) propone `originCountry`,
  `serviceCountries`, `billingCountries`, `currencies`, `supportLanguages`, `supportHours`,
  `paymentMethods` y `foundedYear`, con la misma regla dura: si el sitio no lo dice, vacío.
  Los códigos se validan contra `Intl`; un año futuro se descarta; la IA nunca escribe `[]`
  (cualquier país es una respuesta del fundador) y `mergeSiteDraft` no pisa un `[]` existente.
  Equipo, número de clientes y casos no se piden a la IA (son cifras y clientes; la regla 1 del
  prompt los prohíbe).

## Verificación

`tests/provider-facts.test.ts`: validación de cada campo y sus límites, tri-estado, casos sin
«confirmado», `marketFit`/`languageFit`/`declaredMarkets`, el criterio de Colombia con
`placeProduct`, alertas con `pais`/`idioma`, filas en inglés, la IA y el Markdown. Recorrido en
el navegador contra `neondb` con fichas publicadas temporales (ver docs/comparator.md).

## Pendiente

- Confirmación de casos por el cliente (hoy siempre «declarado»).
- Filtros de país e idioma en Guardados (como §59 dejó capacidades).
- Que Cord y Flouvia declaren sus mercados en su ficha (acción del propietario).
