import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { SearchProvider } from '../components/SearchContext';

export default function App({ Component, pageProps }: AppProps) {
  return <SearchProvider><Component {...pageProps} /></SearchProvider>;
}
