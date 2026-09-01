export const communitySorts=['recent','popular'] as const;
export type CommunitySort=typeof communitySorts[number];
export const communityScore=(likes:number,saves:number,comments:number)=>likes+saves*2+comments*3;
export function communityComment(value:unknown){if(!value||typeof value!=='object')return null;const body=value as Record<string,unknown>;if(typeof body.name!=='string'||typeof body.comment!=='string')return null;const name=body.name.trim(),comment=body.comment.trim();return name.length>0&&name.length<=60&&comment.length>0&&comment.length<=500?{name,comment}:null;}
