import {
  AppsIcon,
  ChartBarIcon,
  ClientsIcon,
  ClipboardCheckIcon,
  CpuIcon,
  FlagIcon,
  GlobeIcon,
  HandshakeIcon,
  HomeIcon,
  InboxIcon,
  LogIcon,
  MailIcon,
  MegaphoneIcon,
  MessagesIcon,
  NewspaperIcon,
  PersonGearIcon,
  ShieldIcon,
  type GotaIcon,
} from '@/components/icons/gota';

export type CountKey = 'reviews' | 'reports' | 'inquiries' | 'mail';

export interface NavItem {
  href: string;
  label: string;
  Icon: GotaIcon;
  exact?: boolean;
  admin?: boolean;
  count?: CountKey;
  keywords?: string;
}

export const NAV: Array<{ section: string; items: NavItem[] }> = [
  {
    section: 'Operación',
    items: [
      {
        href: '/panel',
        label: 'Inicio',
        Icon: HomeIcon,
        exact: true,
        keywords: 'dashboard resumen',
      },
      {
        href: '/panel/revision',
        label: 'Revisión',
        Icon: ClipboardCheckIcon,
        count: 'reviews',
        keywords: 'cola pendientes aprobar',
      },
      {
        href: '/panel/postulaciones',
        label: 'Postulaciones',
        Icon: AppsIcon,
        keywords: 'fichas soluciones proyectos',
      },
      {
        href: '/panel/reportes',
        label: 'Reportes',
        Icon: FlagIcon,
        count: 'reports',
        keywords: 'denuncias moderación',
      },
      {
        href: '/panel/dominios',
        label: 'Dominios',
        Icon: GlobeIcon,
        keywords: 'txt verificación dns',
      },
    ],
  },
  {
    section: 'Plataforma',
    items: [
      {
        href: '/panel/cuentas',
        label: 'Cuentas',
        Icon: ClientsIcon,
        keywords: 'usuarios personas',
      },
      {
        href: '/panel/contactos',
        label: 'Contactos',
        Icon: HandshakeIcon,
        keywords: 'solicitudes oportunidades leads',
      },
      {
        href: '/panel/comunidad',
        label: 'Comunidad',
        Icon: MessagesIcon,
        keywords: 'listas comentarios',
      },
      {
        href: '/panel/mensajes',
        label: 'Mensajes',
        Icon: InboxIcon,
        count: 'inquiries',
        keywords: 'contacto formulario',
      },
      {
        href: '/panel/correo',
        label: 'Correo',
        Icon: MailIcon,
        count: 'mail',
        keywords: 'avisos outbox resend',
      },
      {
        href: '/panel/newsletter',
        label: 'Newsletter',
        Icon: NewspaperIcon,
        keywords: 'suscriptores',
      },
      {
        href: '/panel/anuncios',
        label: 'Anuncios',
        Icon: MegaphoneIcon,
        keywords: 'patrocinados stripe pagos ingresos campañas',
      },
      {
        href: '/panel/metricas',
        label: 'Métricas',
        Icon: ChartBarIcon,
        keywords: 'vistas clics analytics',
      },
    ],
  },
  {
    section: 'Control',
    items: [
      {
        href: '/panel/seguridad',
        label: 'Seguridad',
        Icon: ShieldIcon,
        keywords: 'sesiones 2fa accesos',
      },
      {
        href: '/panel/sistema',
        label: 'Sistema',
        Icon: CpuIcon,
        admin: true,
        keywords: 'salud base de datos storage',
      },
      {
        href: '/panel/equipo',
        label: 'Equipo',
        Icon: PersonGearIcon,
        admin: true,
        keywords: 'revisores administradores',
      },
      {
        href: '/panel/bitacora',
        label: 'Bitácora',
        Icon: LogIcon,
        admin: true,
        keywords: 'auditoría log',
      },
    ],
  },
];

export function isActive(pathname: string, item: NavItem) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + '/');
}
