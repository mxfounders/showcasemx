import { notFound } from 'next/navigation';
import { isSolutionId } from '@/lib/solutions/model';
import { requireFounder,getSolution,isReviewer } from '@/lib/solutions/server';
import { SolutionPresentation } from '@/components/solutions/solution-presentation';
export const metadata={title:'Vista previa privada | shwcs',robots:{index:false,follow:false}};
export default async function PreviewPage(props:{params: Promise<{id:string}>}) {
 const params = await props.params;
 if(!isSolutionId(params.id))notFound();const account=await requireFounder(),reviewer=await isReviewer(account.id),solution=await getSolution(params.id,account.id,reviewer);if(!solution)notFound();
 return <SolutionPresentation data={solution.data} id={solution.id} preview/>;
}
