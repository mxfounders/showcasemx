# Actividad social de la comunidad

La capa social ayuda a descubrir selecciones útiles sin convertir shwcs en una red de métricas vacías. Toda cifra viene de una acción persistida de una cuenta.

## Orden

- **Recientes:** `buyer_lists.created_at DESC`.
- **Populares:** `likes × 1 + listas guardadas × 2 + comentarios × 3`, con desempate por creación reciente. El peso aumenta con el esfuerzo y la intención de la acción: reaccionar, conservar y aportar.
- El cálculo se hace en la consulta pública y se muestra como orden, no como sello editorial. No tiene decaimiento temporal ni detección avanzada de fraude.

## Acciones y privacidad

`POST /api/community` acepta `like`, `save`, `comment` y `delete-comment`. Todas exigen mismo origen y sesión. Like/guardado son toggles atómicos y únicos por cuenta/lista; el dueño no puede autoasignarlos. Comentarios usan un UUID del cliente para que un reintento no duplique contenido.

El visitante elige el alias que será público. No se deriva del correo ni del perfil. Solo se renderizan alias, cuerpo, fecha y un permiso calculado de borrado. El autor puede borrar su comentario y el curador puede moderar cualquier comentario de su propia lista.

Guardar una lista no avisa al curador ni revela quién la guardó. `/account/community` solo devuelve las listas guardadas que siguen públicas. Cambiar a privada invalida el detalle y todas las consultas visibles de inmediato.

## Esquema y operación

`db/community-social.sql` crea `community_list_likes`, `community_saved_lists` y `community_list_comments`. Las relaciones dependen de cuentas/listas con `ON DELETE CASCADE`. Aplicar con:

```bash
node scripts/migrate-community-social.cjs
```

La migración ya se aplicó a la conexión local configurada. Cada proyecto o base de despliegue debe verificarse por separado.

## Antes de abrir ampliamente

Faltan reporte central de listas/comentarios, bloqueo de autores, cola y responsable de moderación, apelaciones, retención y señales contra multicuentas. El borrado por curador permite una beta acotada, pero no sustituye esas herramientas. Tampoco hay notificaciones, seguimiento de autores o perfiles públicos.
