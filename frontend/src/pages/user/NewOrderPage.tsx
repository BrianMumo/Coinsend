import { Link } from 'react-router-dom';
import { Card, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { PageTitle } from '../../components/ui/PageTitle';
import { ArrowDownLeft, ArrowUpRight, Globe, TrendingUp, ArrowRight } from 'lucide-react';

const orderTypes = [
  {
    id: 'crypto-to-kes',
    icon: ArrowDownLeft,
    title: 'Crypto to KES',
    description: 'Sell USDT or USDC and receive KES directly to your M-Pesa.',
    color: 'bg-green-100 text-green-600',
    to: '/orders/new/crypto-to-kes',
  },
  {
    id: 'kes-to-crypto',
    icon: ArrowUpRight,
    title: 'KES to Crypto',
    description: 'Buy USDT or USDC using M-Pesa with competitive exchange rates.',
    color: 'bg-blue-100 text-blue-600',
    to: '/orders/new/kes-to-crypto',
  },
  {
    id: 'cross-border',
    icon: Globe,
    title: 'Cross-Border Payment',
    description: 'Send money to South Africa, Uganda, Tanzania, Nigeria, China, or UAE.',
    color: 'bg-purple-100 text-purple-600',
    to: '/orders/new/cross-border',
  },
  {
    id: 'otc',
    icon: TrendingUp,
    title: 'OTC Trade',
    description: 'Large volume trades with personalized rates and dedicated support.',
    color: 'bg-orange-100 text-orange-600',
    to: '/orders/new/crypto-to-kes', // Redirect to regular form for MVP
    disabled: false,
  },
];

const NewOrderPage = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle title="New Order" description="Choose a transaction type to create a new order on Coinsend." />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
        <p className="text-gray-600">Select the type of transaction you want to make.</p>
      </div>

      <div className="grid gap-4">
        {orderTypes.map((type) => (
          <Link key={type.id} to={type.to}>
            <Card className="hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`p-4 rounded-xl ${type.color}`}>
                  <type.icon className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{type.title}</CardTitle>
                  <CardDescription className="mt-1">{type.description}</CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NewOrderPage;
