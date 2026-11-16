import './globals.css';

export const metadata={
  title:{default:'BharatCode Atlas',template:'%s · BharatCode Atlas'},
  description:'Explore and research BharatCode Build League projects.'
};

export const viewport={width:'device-width',initialScale:1};

export default function RootLayout({children}){
  return <html lang="en"><body><a className="skip" href="#main">Skip to content</a>{children}</body></html>;
}
