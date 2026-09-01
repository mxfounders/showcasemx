export const dashboardModes={buyer:'Comprador',founder:'Fundador',both:'Ambos'} as const;
export type DashboardMode=keyof typeof dashboardModes;
export function isDashboardMode(value:unknown):value is DashboardMode{return typeof value==='string'&&Object.hasOwn(dashboardModes,value);}
export function resolveDashboardMode(preference:unknown,profile:unknown,hasSolutions:boolean):DashboardMode{
 if(isDashboardMode(preference))return preference;
 if(isDashboardMode(profile))return profile;
 return hasSolutions?'founder':'buyer';
}
