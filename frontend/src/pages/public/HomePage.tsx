import { Link } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { PageTitle } from '../../components/ui/PageTitle';
import {
  ArrowRight,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  MessageCircle,
  CheckCircle,
  Smartphone,
  CreditCard,
  Users,
  Clock,
  Lock,
} from 'lucide-react';

const WHATSAPP_NUMBER = '+254768294351';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;

const features = [
  {
    icon: Zap,
    title: 'Fast Transactions',
    description: 'Complete crypto-to-cash and cross-border payments in minutes, not days.',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Bank-grade security with encrypted transactions and verified processing.',
  },
  {
    icon: Globe,
    title: 'Cross-Border Payments',
    description: 'Send money to Kenya, South Africa, Uganda, Tanzania, Nigeria, China, and UAE.',
  },
  {
    icon: TrendingUp,
    title: 'Competitive Rates',
    description: 'Get the best exchange rates for crypto and international transfers.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Create Account',
    description: 'Sign up in seconds with just your email and phone number.',
    icon: Users,
  },
  {
    number: '02',
    title: 'Choose Service',
    description: 'Select crypto exchange, cross-border transfer, or OTC trading.',
    icon: CreditCard,
  },
  {
    number: '03',
    title: 'Make Payment',
    description: 'Pay via M-Pesa or send crypto to our secure wallets.',
    icon: Smartphone,
  },
  {
    number: '04',
    title: 'Receive Funds',
    description: 'Get your money delivered to M-Pesa, bank, or crypto wallet.',
    icon: CheckCircle,
  },
];

const stats = [
  { value: '10K+', label: 'Happy Customers' },
  { value: '$5M+', label: 'Transactions Processed' },
  { value: '7', label: 'Countries Supported' },
  { value: '24/7', label: 'Customer Support' },
];

const HomePage = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageTitle title="" description="Convert crypto to cash, buy crypto with M-Pesa, and send money across Africa. Fast, trusted, and borderless payments." />
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2"></div>
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-white rounded-full translate-y-1/2"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 pt-20 pb-24 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Trusted by 10,000+ customers across Africa
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                <span className="text-yellow-300">Fast.</span>{' '}
                <span className="text-green-300">Trusted.</span>
                <span className="block text-white">Borderless Payments</span>
              </h1>
              <p className="text-lg md:text-xl text-primary-100 mb-8 max-w-xl">
                Convert crypto to cash, buy crypto with M-Pesa, and send money across Africa
                and beyond — all in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl bg-white text-primary-700 hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl w-full sm:w-auto"
                >
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/rates"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl border-2 border-white/30 text-white hover:bg-white/10 transition-all w-full sm:w-auto"
                >
                  View Live Rates
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="mt-10 flex flex-wrap items-center gap-6 justify-center lg:justify-start">
                <div className="flex items-center gap-2 text-primary-200">
                  <Lock className="h-5 w-5" />
                  <span className="text-sm">256-bit SSL</span>
                </div>
                <div className="flex items-center gap-2 text-primary-200">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm">24/7 Support</span>
                </div>
                <div className="flex items-center gap-2 text-primary-200">
                  <Shield className="h-5 w-5" />
                  <span className="text-sm">Verified Business</span>
                </div>
              </div>
            </div>

            {/* Right Content - Hero Image */}
            <div className="relative hidden lg:block">
              <div className="relative z-10">
                <img
                  src="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=500&fit=crop"
                  alt="Mobile banking and crypto payments"
                  className="rounded-2xl shadow-2xl"
                />
                {/* Floating Cards */}
                <div className="absolute -left-8 top-1/4 bg-white text-gray-900 p-4 rounded-xl shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Payment Received</p>
                      <p className="font-semibold">KES 50,000</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-4 bottom-1/4 bg-white text-gray-900 p-4 rounded-xl shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">USDT/KES Rate</p>
                      <p className="font-semibold">129.50</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary-600">{stat.value}</p>
                <p className="text-gray-600 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Our Services</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4">Everything You Need</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Whether you need to convert crypto to local currency or send money internationally,
              we have got you covered with fast, secure, and affordable solutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary-200 transition-all">
              <div className="relative h-40 mb-4 rounded-xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=200&fit=crop"
                  alt="Crypto to KES"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-3 left-3">
                  <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded">Popular</span>
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">Crypto to KES</h3>
              <p className="text-gray-600 text-sm mb-4">
                Sell USDT or USDC and receive KES directly to your M-Pesa within minutes.
              </p>
              <Link to="/register" className="text-primary-600 font-medium text-sm hover:text-primary-700 inline-flex items-center">
                Start Selling <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary-200 transition-all">
              <div className="relative h-40 mb-4 rounded-xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&h=200&fit=crop"
                  alt="KES to Crypto"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>
              <h3 className="font-semibold text-lg mb-2">KES to Crypto</h3>
              <p className="text-gray-600 text-sm mb-4">
                Buy USDT or USDC using M-Pesa with the best rates in Kenya.
              </p>
              <Link to="/register" className="text-primary-600 font-medium text-sm hover:text-primary-700 inline-flex items-center">
                Start Buying <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary-200 transition-all">
              <div className="relative h-40 mb-4 rounded-xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=200&fit=crop"
                  alt="Cross-Border Payments"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>
              <h3 className="font-semibold text-lg mb-2">Cross-Border</h3>
              <p className="text-gray-600 text-sm mb-4">
                Send money to South Africa, Uganda, Tanzania, Nigeria, China, and UAE.
              </p>
              <Link to="/register" className="text-primary-600 font-medium text-sm hover:text-primary-700 inline-flex items-center">
                Send Money <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary-200 transition-all">
              <div className="relative h-40 mb-4 rounded-xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop"
                  alt="OTC Trading Desk"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-3 left-3">
                  <span className="bg-purple-500 text-white text-xs font-semibold px-2 py-1 rounded">Premium</span>
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">OTC Desk</h3>
              <p className="text-gray-600 text-sm mb-4">
                Large volume trades with personalized rates and dedicated support.
              </p>
              <Link to="/register" className="text-primary-600 font-medium text-sm hover:text-primary-700 inline-flex items-center">
                Contact Us <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">How It Works</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4">Simple 4-Step Process</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Get started in minutes. Our streamlined process makes it easy to send and receive money.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-gray-200">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary-600 rounded-full"></div>
                  </div>
                )}
                <div className="text-center relative z-10">
                  <div className="w-24 h-24 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
                    <step.icon className="h-10 w-10 text-primary-600" />
                    <span className="absolute -top-2 -right-2 w-8 h-8 bg-primary-600 text-white text-sm font-bold rounded-full flex items-center justify-center">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section with Image */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=500&fit=crop"
                alt="Secure mobile payments"
                className="rounded-2xl shadow-xl"
              />
              <div className="absolute -bottom-6 -right-6 bg-primary-600 text-white p-6 rounded-xl shadow-lg hidden md:block">
                <p className="text-3xl font-bold">99.9%</p>
                <p className="text-primary-100 text-sm">Uptime Guaranteed</p>
              </div>
            </div>

            {/* Features List */}
            <div>
              <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Why Choose Us</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-8">Built for Speed, Security & Simplicity</h2>

              <div className="space-y-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Countries */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Supported Countries & Currencies</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { flag: '🇰🇪', name: 'Kenya', currency: 'KES' },
              { flag: '🇿🇦', name: 'South Africa', currency: 'ZAR' },
              { flag: '🇺🇬', name: 'Uganda', currency: 'UGX' },
              { flag: '🇹🇿', name: 'Tanzania', currency: 'TZS' },
              { flag: '🇳🇬', name: 'Nigeria', currency: 'NGN' },
              { flag: '🇨🇳', name: 'China', currency: 'CNY' },
              { flag: '🇦🇪', name: 'UAE', currency: 'AED' },
            ].map((country, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full">
                <span className="text-2xl">{country.flag}</span>
                <span className="font-medium">{country.name}</span>
                <span className="text-gray-400 text-sm">({country.currency})</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-600 to-primary-800 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <p className="text-primary-200 font-medium mb-2">Fast. Trusted. Borderless.</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-100 text-lg mb-8">
            Join thousands of customers who trust Coinsend for their borderless payments.
            Create your free account in less than 2 minutes.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl bg-white text-primary-700 hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
          >
            Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
          <p className="text-gray-600 mb-6">
            Our support team is available 24/7 to assist you with any questions or concerns.
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-semibold transition-colors shadow-lg"
          >
            <MessageCircle className="h-5 w-5" />
            Chat on WhatsApp
          </a>
          <p className="mt-4 text-gray-500 text-sm">{WHATSAPP_NUMBER}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white text-xl font-bold mb-2">Coinsend</h3>
              <p className="text-primary-400 text-sm font-medium mb-3">Fast. Trusted. Borderless Payments.</p>
              <p className="text-sm">
                Your trusted partner for crypto exchange and cross-border payments across Africa.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/register" className="hover:text-white transition-colors">Crypto to KES</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">KES to Crypto</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Cross-Border</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">OTC Desk</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/rates" className="hover:text-white transition-colors">Live Rates</Link></li>
                <li><a href={WHATSAPP_LINK} className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Support
              </a>
              <p className="mt-2 text-sm">{WHATSAPP_NUMBER}</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} Coinsend. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
