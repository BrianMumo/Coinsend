import { Helmet } from 'react-helmet-async';

interface PageTitleProps {
  title: string;
  description?: string;
}

export const PageTitle = ({ title, description }: PageTitleProps) => {
  const fullTitle = title ? `${title} | Coinsend` : 'Coinsend - Fast. Trusted. Borderless Payments';
  const defaultDescription = 'Convert crypto to cash, buy crypto with M-Pesa, and send money across Africa and beyond. Fast, trusted, and borderless payments.';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDescription} />
    </Helmet>
  );
};
