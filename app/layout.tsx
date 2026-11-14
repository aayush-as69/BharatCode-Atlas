import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'BharatCode Atlas',description:'Explore and research BharatCode Build League projects.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
