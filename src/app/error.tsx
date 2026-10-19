'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="not-found"><h1>A moment,<br/><em>please.</em></h1><p>We couldn’t load this space. Please try again.</p><button className="button" onClick={reset}>Try again</button><Link href="/">Return home</Link></main>;}
