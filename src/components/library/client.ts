export async function changeLibrary(body:Record<string,unknown>){
 const response=await fetch('/api/library',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 if(!response.ok)throw new Error(result.error||'No pudimos guardar el cambio.');
 return result as {ok:boolean;id?:string};
}
export const libraryField='mt-2 w-full rounded-xl border border-stone-300 bg-transparent px-4 py-3 text-base outline-none focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';
export const libraryButton='action-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium disabled:opacity-50';
export function libraryError(error:unknown){return error instanceof Error&&!['TypeError','TimeoutError','SyntaxError'].includes(error.name)?error.message:'No pudimos confirmar el cambio. Recarga para comprobarlo antes de repetir.';}
