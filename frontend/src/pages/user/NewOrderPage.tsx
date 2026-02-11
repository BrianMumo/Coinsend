import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { PageTitle } from '../../components/ui/PageTitle';
import { ArrowDownLeft, ArrowUpRight, ArrowRight } from 'lucide-react';

const orderTypes = [
  {
    id: 'sell-usdt',
    icon: ArrowDownLeft,
    title: 'Sell USDT',
    description: 'Convert your USDT to KES and receive via M-Pesa.',
    color: 'bg-green-100 text-green-600',
    borderColor: 'hover:border-green-300',
    to: '/orders/new/crypto-to-kes',
  },
  {
    id: 'buy-usdt',
    icon: ArrowUpRight,
    title: 'Buy USDT',
    description: 'Buy USDT with KES using M-Pesa or account balance.',
    color: 'bg-blue-100 text-blue-600',
    borderColor: 'hover:border-blue-300',
    to: '/orders/new/kes-to-crypto',
  },
];

const NewOrderPage = () => {
  return (
    <div className="max-w-lg mx-auto">
      <PageTitle title="New Order" description="Buy or sell USDT on Coinsend." />
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">New Order</h1>
        <p className="text-sm text-gray-500">What would you like to do?</p>
      </div>

      <div className="space-y-3">
        {orderTypes.map((type) => (
          <Link key={type.id} to={type.to}>
            <Card className={`${type.borderColor} hover:shadow-md transition-all cursor-pointer border-2 border-transparent`}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`p-3 rounded-xl ${type.color}`}>
                  <type.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{type.title}</p>
                  <p className="text-sm text-gray-500">{type.description}</p>
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
