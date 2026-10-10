export const compliance = {
  public: {
    clear: 'Sin coincidencias en la lista 69-B del SAT.',
    presunto:
      'Aparece como «presunto» en la lista 69-B del SAT: la autoridad presume que factura operaciones inexistentes y el proceso sigue abierto.',
    definitivo:
      'Aparece como «definitivo» en la lista 69-B del SAT: sus facturas no tienen efectos fiscales para quien las recibe.',
    desvirtuado:
      'Aparece en la lista 69-B del SAT como «desvirtuado»: demostró que sus operaciones existieron.',
    sentencia_favorable:
      'Aparece en la lista 69-B del SAT con «sentencia favorable»: un tribunal resolvió a su favor.',
    pending: 'Declaró su RFC; la consulta a la lista 69-B del SAT está pendiente.',
    declaredOnly:
      'Declaró su identificación fiscal de {country}. Aún no consultamos registros de ese país.',
    source:
      'RFC declarado por el proveedor; no lo publicamos. Lista del SAT con datos al {date}, consultada el {checked}. Es una consulta pública, no una certificación.',
    sourceNoDate:
      'RFC declarado por el proveedor; no lo publicamos. Es una consulta pública, no una certificación.',
  },
  owner: {
    title: 'Identidad fiscal',
    desc: 'Declara la identificación fiscal con la que facturas. Es privada: en tu ficha solo aparece el resultado de consultarla en registros públicos (en México, la lista 69-B del SAT), y permite que tus clientes comprueben su compra en sus reseñas.',
    country: 'País',
    taxId: 'Identificación fiscal',
    taxIdMx: 'RFC',
    save: 'Guardar',
    saving: 'Guardando…',
    remove: 'Quitar',
    removing: 'Quitando…',
    saved: 'Guardado. El resultado ya se ve en tu ficha pública.',
    removed: 'Quitada. Tu ficha ya no muestra resultados de registros.',
    current: 'Resultado actual',
    public: 'Esto es lo que ve un comprador:',
  },
  errors: {
    foreignOrigin: 'Envía el formulario desde shwcs.',
    signIn: 'Inicia sesión para continuar.',
    invalidRequest: 'No pudimos procesar la solicitud.',
    rateLimited: 'Demasiados cambios seguidos. Espera unos minutos.',
    notOwner: 'Solo quien publica la solución puede declarar su identidad fiscal.',
    country: 'Elige un país de la lista.',
    taxId: 'Escribe la identificación fiscal (3 a 40 letras o números).',
    rfc: 'Escribe un RFC válido: 12 caracteres (persona moral) o 13 (persona física).',
    genericRfc: 'El RFC genérico no identifica a un proveedor.',
    saveFailed: 'No pudimos guardar. Intenta de nuevo.',
  },
} as const;
