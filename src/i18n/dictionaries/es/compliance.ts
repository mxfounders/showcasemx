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
    pending: 'Tenemos su RFC; la consulta a la lista 69-B del SAT está pendiente.',
    declaredOnly:
      'Tenemos su identificación fiscal de {country}. Aún no consultamos registros de ese país.',
    source:
      'RFC registrado por el equipo de shwcs al revisar el proyecto; no lo publicamos. Lista del SAT con datos al {date}, consultada el {checked}. Es una consulta pública, no una certificación.',
    sourceNoDate:
      'RFC registrado por el equipo de shwcs al revisar el proyecto; no lo publicamos. Es una consulta pública, no una certificación.',
  },
} as const;
