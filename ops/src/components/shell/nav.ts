import {
  BarChart3,
  ClipboardCheck,
  Cpu,
  Flag,
  Globe,
  Handshake,
  Home,
  Inbox,
  LayoutGrid,
  Megaphone,
  Mail,
  MessagesSquare,
  Newspaper,
  ScrollText,
  ShieldCheck,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type CountKey = 'reviews' | 'reports' | 'inquiries' | 'mail';

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  exact?: boolean;
  admin?: boolean;
  count?: CountKey;
  keywords?: string;
}

export const NAV: Array<{ section: string; items: NavItem[] }> = [
  {
    section: 'Operación',
    items: [
      { href: '/panel', label: 'Inicio', Icon: Home, exact: true, keywords: 'dashboard resumen' },
      {
        href: '/panel/revision',
        label: 'Revisión',
        Icon: ClipboardCheck,
        count: 'reviews',
        keywords: 'cola pendientes aprobar',
      },
      {
        href: '/panel/postulaciones',
        label: 'Postulaciones',
        Icon: LayoutGrid,
        keywords: 'fichas soluciones proyectos',
      },
      {
        href: '/panel/reportes',
        label: 'Reportes',
        Icon: Flag,
        count: 'reports',
        keywords: 'denuncias moderación',
      },
      { href: '/panel/dominios', label: 'Dominios', Icon: Globe, keywords: 'txt verificación dns' },
    ],
  },
  {
    section: 'Plataforma',
    items: [
      { href: '/panel/cuentas', label: 'Cuentas', Icon: Users, keywords: 'usuarios personas' },
      {
        href: '/panel/contactos',
        label: 'Contactos',
        Icon: Handshake,
        keywords: 'solicitudes oportunidades leads',
      },
      {
        href: '/panel/comunidad',
        label: 'Comunidad',
        Icon: MessagesSquare,
        keywords: 'listas comentarios',
      },
      {
        href: '/panel/mensajes',
        label: 'Mensajes',
        Icon: Inbox,
        count: 'inquiries',
        keywords: 'contacto formulario',
      },
      {
        href: '/panel/correo',
        label: 'Correo',
        Icon: Mail,
        count: 'mail',
        keywords: 'avisos outbox resend',
      },
      { href: '/panel/newsletter', label: 'Newsletter', Icon: Newspaper, keywords: 'suscriptores' },
      {
        href: '/panel/anuncios',
        label: 'Anuncios',
        Icon: Megaphone,
        keywords: 'patrocinados stripe pagos ingresos campañas',
      },
      {
        href: '/panel/metricas',
        label: 'Métricas',
        Icon: BarChart3,
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
        Icon: ShieldCheck,
        keywords: 'sesiones 2fa accesos',
      },
      {
        href: '/panel/sistema',
        label: 'Sistema',
        Icon: Cpu,
        admin: true,
        keywords: 'salud base de datos storage',
      },
      {
        href: '/panel/equipo',
        label: 'Equipo',
        Icon: UserCog,
        admin: true,
        keywords: 'revisores administradores',
      },
      {
        href: '/panel/bitacora',
        label: 'Bitácora',
        Icon: ScrollText,
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
