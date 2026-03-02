import { Helmet } from 'react-helmet-async';

interface PageTitleProps {
  title: string;
  description?: string;
  path?: string;
}

export const PageTitle = ({ title, description, path }: PageTitleProps) => {
  const fullTitle = title ? `${title} | Coinsend` : 'Coinsend - Convert Crypto to Kenya Shillings Instantly';
  const defaultDescription = 'Convert USDT to Kenya Shillings instantly. No bank account needed. Get M-Pesa mobile money in seconds. Perfect for tourists, travelers & freelancers.';
  const desc = description || defaultDescription;
  const url = path ? `https://coinsend.io${path}` : 'https://coinsend.io';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <link rel="canonical" href={url} />
    </Helmet>
  );
};
