import { requireBuyer,getBoards } from '@/lib/library/server';
import { BoardGallery } from '@/components/library/board-gallery';
export const metadata={title:'Mis listas | shwcs',robots:{index:false,follow:false}};
export default async function ListsPage(){const account=await requireBuyer('/account/lists');const boards=await getBoards(account.id);return <section className="account-page"><header className="mb-9"><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Mis listas.</h1></header><BoardGallery boards={boards}/></section>;}
