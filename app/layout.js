import './globals.css';

export const metadata={
  title:'BharatCode Atlas',
  description:'Explore and research BharatCode Build League projects.'
};

export default function RootLayout({children}){
  return <html lang="en"><body>{children}</body></html>;
}
