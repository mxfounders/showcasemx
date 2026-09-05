"use client";
import Image from 'next/image';
import { useState } from 'react';
import { brandColors } from '@/lib/brand-colors';
const tones=[brandColors.blue,brandColors.sage,brandColors.lavender,brandColors.amber,brandColors.terracotta];
export function ProjectCover({name,image,compact=false}:{name:string;image?:string;compact?:boolean}){
 const [failed,setFailed]=useState<string>();
 const tone=tones[Array.from(name).reduce((total,c)=>total+c.charCodeAt(0),0)%tones.length];
 return <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden" style={{backgroundColor:tone.soft,color:tone.solid}}>{image&&failed!==image?<Image src={image} alt="" fill sizes="(max-width: 640px) 90vw, 400px" className="object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transform-none" onError={()=>setFailed(image)}/>:<span className={compact?'text-xl font-semibold':'px-6 text-center text-3xl font-semibold tracking-tight'}>{compact?name.slice(0,1):name}</span>}</div>;
}
