import type { Metadata } from 'next';
import { BlogIndex } from '@/components/blog/blog-index';

export const metadata: Metadata = { title: 'Blog | shwcs', description: 'Ideas de shwcs para elegir, construir y operar mejores productos y servicios.' };

export default function BlogPage() { return <BlogIndex />; }
