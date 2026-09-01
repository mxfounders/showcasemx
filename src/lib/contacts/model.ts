export const companySizes = ['Solo yo','2–10 personas','11–50 personas','51–200 personas','Más de 200 personas'] as const;
export const timelines = ['Estoy explorando','Este mes','En 1–3 meses','Más adelante'] as const;
export const contactStatuses = {new:'Nueva',conversation:'En conversación',closed:'Cerrada',withdrawn:'Retirada'} as const;
export type ContactStatus = keyof typeof contactStatuses;
export const consentVersion = 'contact-v1';
export const contactConsent = 'Autorizo compartir mi nombre, correo de mi cuenta, empresa y los datos de esta solicitud con la cuenta propietaria de este proyecto para atenderla. Mis guardados, listas y notas no se comparten.';
export type ContactDetails = {name:string;company:string;size:string;timeline:string;budget:string;need:string};
export const contactFields = {name:100,company:150,size:40,timeline:40,budget:200,need:2000} as const;
export function readContact(value:Record<string,unknown>):ContactDetails|null {
 const result={} as ContactDetails;
 for(const key of Object.keys(contactFields) as (keyof ContactDetails)[]){
  if(typeof value[key]!=='string'||value[key].length>contactFields[key])return null;
  result[key]=value[key].trim();
 }
 return result.name.length>=2&&result.company.length>=2&&result.need.length>=20&&companySizes.some(x=>x===result.size)&&timelines.some(x=>x===result.timeline)?result:null;
}
export function isContactStatus(value:unknown):value is ContactStatus{return typeof value==='string'&&Object.hasOwn(contactStatuses,value);}
export function canTransition(current:ContactStatus,next:ContactStatus,actor:'buyer'|'recipient'){
 if(actor==='buyer')return next==='withdrawn'&&(current==='new'||current==='conversation');
 return (current==='new'&&(next==='conversation'||next==='closed'))||(current==='conversation'&&next==='closed')||(current==='closed'&&next==='conversation');
}
export type ContactRequest={id:string;buyer_id:string;recipient_id:string;solution_id:string;project_name:string;buyer_email:string;details:ContactDetails;status:ContactStatus;version:number;created_at:string;updated_at:string};
export type ContactEvent={id:string;actor_id:string;status:ContactStatus;message:string;created_at:string};
export class ContactError extends Error {constructor(public status:number,message:string){super(message);this.name='ContactError';}}
