/** Following public lists and curators (SHCWS-121). */
export const follows = {
  actions: {
    followList: 'Seguir lista',
    followingList: 'Sigues esta lista',
    followCurator: 'Seguir a {name}',
    followingCurator: 'Sigues a {name}',
    hint: 'Te avisamos en tu cuenta cuando la lista sume proyectos o {name} publique otra. Nadie ve quién sigue a quién.',
    signIn: 'Inicia sesión',
    signInSuffix: 'para seguir listas y curadores.',
    error: 'No pudimos guardar el cambio. Intenta otra vez.',
  },
  page: {
    listsTitle: 'Listas que sigues',
    listsEmpty: 'Aún no sigues ninguna lista. En una lista pública, elige «Seguir lista».',
    curatorsTitle: 'Curadores que sigues',
    curatorsEmpty: 'Aún no sigues a ningún curador. En una lista pública, elige «Seguir a…».',
    curatorListsSingular: '1 lista pública',
    curatorListsPlural: '{count} listas públicas',
    curatorNoLists: 'Sin listas públicas por ahora',
    unfollow: 'Dejar de seguir',
    unfollowing: 'Un momento…',
    followersTitle: 'Quién te sigue',
    followersBody: 'Solo números: nunca mostramos quién sigue a quién.',
    curatorFollowersSingular: '1 persona sigue tus listas firmadas como «{name}»',
    curatorFollowersPlural: '{count} personas siguen tus listas firmadas como «{name}»',
    listFollowersSingular: '1 persona sigue «{name}»',
    listFollowersPlural: '{count} personas siguen «{name}»',
    noFollowers: 'Nadie sigue todavía tus listas públicas.',
    emailNote:
      'Los avisos llegan a tu cuenta. Por correo, solo un resumen semanal si activas los correos de comunidad en {link}.',
    preferences: 'Preferencias de avisos',
  },
  /** Messages returned by /api/follows. */
  errors: {
    foreignOrigin: 'Usa shwcs para seguir listas.',
    signIn: 'Inicia sesión para seguir listas y curadores.',
    invalid: 'Solicitud no válida.',
    own: 'No puedes seguir tus propias listas.',
    notPublic: 'Esta lista ya no es pública.',
    rateLimited: 'Demasiados cambios. Intenta más tarde.',
    unavailable: 'No pudimos guardar el cambio. Intenta otra vez.',
  },
} as const;
