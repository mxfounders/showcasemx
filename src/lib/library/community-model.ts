export const communitySorts=['recent','popular'] as const;
export type CommunitySort=typeof communitySorts[number];
export const communityScore=(likes:number,saves:number,comments:number)=>likes+saves*2+comments*3;
export function communityComment(value:unknown){if(!value||typeof value!=='object')return null;const body=value as Record<string,unknown>;if(typeof body.name!=='string'||typeof body.comment!=='string')return null;const name=body.name.trim(),comment=body.comment.trim();return name.length>0&&name.length<=60&&comment.length>0&&comment.length<=500?{name,comment}:null;}
export const communityReportReasons=['spam','abuse','impersonation','other'] as const;
export type CommunityReportReason=typeof communityReportReasons[number];
export function communityReport(value:unknown){if(!value||typeof value!=='object')return null;const body=value as Record<string,unknown>;if(typeof body.reason!=='string'||!communityReportReasons.includes(body.reason as CommunityReportReason)||typeof body.details!=='string')return null;const details=body.details.trim();return details.length>=10&&details.length<=2000?{reason:body.reason as CommunityReportReason,details}:null;}
export function escapeLikeTerm(value:string){return value.replace(/[\\%_]/g,match=>'\\'+match);}
