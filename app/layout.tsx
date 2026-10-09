import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title: 'Mansoor Khan | Front-End Developer',
 description: 'Mansoor Khan builds clean, responsive business websites, landing pages, and front-end experiences with React, Next.js, and Tailwind CSS. Based in Pakistan, working worldwide.',
 icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
