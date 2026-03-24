import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { PageTitle } from '../../components/ui/PageTitle';
import { ratesApi } from '../../api/rates.api';
import {
  ArrowRight,
  Shield,
  Zap,
  Wallet,
  MessageCircle,
  Smartphone,
  BadgeCheck,
  Globe,
  Users,
  TrendingUp,
  Repeat,
  Building2,
  Briefcase,
  Star,
  CheckCircle2,
  ArrowLeftRight,
  Landmark,
  Send,
} from 'lucide-react';

const WHATSAPP_NUMBER = '+254768294351';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;

const HomePage = () => {
  const [sellRate, setSellRate] = useState<number>(130);
  const [buyRate, setBuyRate] = useState<number>(132);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await ratesApi.getAll();
        if (response.success && response.data?.rates) {
          const usdtKesRate = response.data.rates.find(
            (r) => r.pair === 'USDT_KES' && r.isActive
          );
          if (usdtKesRate) {
            setSellRate(Number(usdtKesRate.sellRate));
            setBuyRate(Number(usdtKesRate.buyRate));
          }
        }
      } catch {
        // keep defaults
      }
    };
    fetchRates();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PageTitle
        title="Coinsend — Stablecoin Payments for Africa"
        description="Convert USDT to KES instantly. Send stablecoins, receive M-Pesa. Built for freelancers, businesses, and anyone moving value across Africa."
      />
      <Header />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-primary-900">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 px-4 py-2 rounded-full text-sm mb-8">
              <CheckCircle2 className="h-4 w-4 text-primary-400" />
              <span className="text-primary-300">Instant Stablecoin ↔ M-Pesa Settlements</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Stablecoins for
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-300">
                Real-World Payments
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Send USDT, receive KES on M-Pesa — instantly. Whether you're getting paid globally,
              sending remittances, or running a business, Coinsend bridges stablecoins to Africa's
              payment rails.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25"
              >
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/rates"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl border border-gray-700 text-white hover:bg-white/5 transition-all"
              >
                View Live Rates
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white">{buyRate.toFixed(0)}</p>
                <p className="text-xs text-gray-400 mt-1">KES per USDT</p>
              </div>
              <div className="text-center border-x border-gray-700">
                <p className="text-2xl md:text-3xl font-bold text-white">Instant</p>
                <p className="text-xs text-gray-400 mt-1">Settlement</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white">24/7</p>
                <p className="text-xs text-gray-400 mt-1">Always On</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60V30C240 10 480 0 720 10C960 20 1200 40 1440 30V60H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-gray-600">From stablecoin to spendable cash in 3 steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Send className="h-6 w-6 text-primary-600" />,
                step: '1',
                title: 'Deposit USDT',
                desc: 'Send USDT (TRC-20) from any wallet — Binance, Trust Wallet, Bybit, or any exchange — to your Coinsend address.',
              },
              {
                icon: <ArrowLeftRight className="h-6 w-6 text-primary-600" />,
                step: '2',
                title: 'Instant Conversion',
                desc: 'Your USDT is converted to KES at a competitive live rate. No delays, no manual processing.',
              },
              {
                icon: <Smartphone className="h-6 w-6 text-primary-600" />,
                step: '3',
                title: 'Withdraw to M-Pesa',
                desc: 'Cash out to any M-Pesa number in seconds. Pay for anything, anywhere in Kenya.',
              },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="relative bg-gray-50 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  {icon}
                </div>
                <div className="absolute -top-3 left-6 bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who It's For ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Built for Everyone Holding Stablecoins</h2>
            <p className="text-gray-600">One platform, many use cases</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Globe className="h-6 w-6 text-white" />,
                bg: 'bg-blue-500',
                light: 'from-blue-50 to-blue-100',
                title: 'Freelancers & Remote Workers',
                desc: 'Get paid in USDT from clients worldwide? Convert to KES and withdraw to M-Pesa in seconds. No bank account needed.',
              },
              {
                icon: <Repeat className="h-6 w-6 text-white" />,
                bg: 'bg-primary-500',
                light: 'from-teal-50 to-teal-100',
                title: 'Remittances',
                desc: 'Send money home to Kenya from anywhere in the world. Use USDT to avoid expensive international transfer fees.',
              },
              {
                icon: <Building2 className="h-6 w-6 text-white" />,
                bg: 'bg-purple-500',
                light: 'from-purple-50 to-purple-100',
                title: 'Businesses',
                desc: 'Accept or hold USDT, pay suppliers and staff in KES via M-Pesa. Hedge against local currency volatility.',
              },
              {
                icon: <Briefcase className="h-6 w-6 text-white" />,
                bg: 'bg-orange-500',
                light: 'from-orange-50 to-orange-100',
                title: 'Crypto Traders',
                desc: 'Realized profits in stablecoins? Off-ramp USDT to KES at competitive rates without going through a bank.',
              },
              {
                icon: <Users className="h-6 w-6 text-white" />,
                bg: 'bg-green-500',
                light: 'from-green-50 to-green-100',
                title: 'Travelers & Expats',
                desc: 'In Kenya without a local bank account? Get KES on M-Pesa from your stablecoin wallet within minutes of arriving.',
              },
              {
                icon: <Landmark className="h-6 w-6 text-white" />,
                bg: 'bg-rose-500',
                light: 'from-rose-50 to-rose-100',
                title: 'Cross-Border Payments',
                desc: 'Pay partners or suppliers across East Africa. Convert USDT to KES, UGX, TZS, NGN and more.',
              },
            ].map(({ icon, bg, light, title, desc }) => (
              <div key={title} className={`bg-gradient-to-br ${light} rounded-2xl p-5`}>
                <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                  {icon}
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Coinsend</h2>
            <p className="text-gray-600">The fastest way to spend your stablecoins in Africa</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Zap className="h-5 w-5 text-yellow-600" />,
                bg: 'bg-yellow-100',
                title: 'Instant Settlement',
                desc: 'USDT to KES to M-Pesa in under 60 seconds. No waiting, no business-hours dependency.',
              },
              {
                icon: <TrendingUp className="h-5 w-5 text-primary-600" />,
                bg: 'bg-primary-100',
                title: 'Competitive Rates',
                desc: 'Live market rates, better than banks and traditional forex bureaus. No hidden fees.',
              },
              {
                icon: <Shield className="h-5 w-5 text-blue-600" />,
                bg: 'bg-blue-100',
                title: 'Secure & Trusted',
                desc: 'Your funds are protected end-to-end. Transparent transaction history at all times.',
              },
              {
                icon: <Wallet className="h-5 w-5 text-green-600" />,
                bg: 'bg-green-100',
                title: 'No Bank Account',
                desc: 'All you need is an M-Pesa number. We connect stablecoins directly to mobile money.',
              },
            ].map(({ icon, bg, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                  {icon}
                </div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── M-Pesa Bridge ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary-100 px-3 py-1 rounded-full text-sm text-primary-700 mb-4">
                <CheckCircle2 className="h-4 w-4" />
                Africa's Largest Mobile Money Network
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Stablecoins Meet M-Pesa
              </h2>
              <p className="text-gray-600 mb-6">
                M-Pesa powers over 50 million transactions daily across East Africa. Coinsend
                is the bridge between the stablecoin economy and this payment infrastructure —
                giving your USDT real-world spending power instantly.
              </p>
              <ul className="space-y-3">
                {[
                  'Withdraw KES to any M-Pesa number in seconds',
                  'Accepted at 90%+ of businesses across Kenya',
                  'Pay bills, rent, suppliers, and staff',
                  'No minimum — send any amount from 0.5 USDT',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                      <BadgeCheck className="h-4 w-4 text-primary-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
              <div className="space-y-4">
                {/* Mock transaction card */}
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-primary-100 text-sm">You deposit</span>
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">USDT · TRC-20</span>
                  </div>
                  <p className="text-2xl font-bold">100 USDT</p>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-primary-100 text-sm">You receive</span>
                    <span className="bg-green-500/30 text-green-200 text-xs px-2 py-0.5 rounded-full">M-Pesa · KES</span>
                  </div>
                  <p className="text-2xl font-bold">{(buyRate * 100).toLocaleString()} KES</p>
                  <p className="text-primary-200 text-xs mt-1">Rate: 1 USDT = {buyRate.toFixed(2)} KES</p>
                </div>
                <div className="text-center text-primary-200 text-sm pt-2">
                  ⚡ Settled in under 60 seconds
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Rates ── */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Live Exchange Rates</h2>
            <p className="text-primary-100">Updated in real-time. No surprises at checkout.</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-primary-100 text-sm">Deposit USDT, get KES</span>
                  <span className="bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full">USDT → KES</span>
                </div>
                <p className="text-3xl font-bold">{buyRate.toFixed(2)}</p>
                <p className="text-primary-200 text-sm mt-1">KES per 1 USDT</p>
              </div>
              <div className="bg-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-primary-100 text-sm">Spend KES, get USDT</span>
                  <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full">KES → USDT</span>
                </div>
                <p className="text-3xl font-bold">{sellRate.toFixed(2)}</p>
                <p className="text-primary-200 text-sm mt-1">KES per 1 USDT</p>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link to="/rates" className="inline-flex items-center text-white hover:text-primary-100 font-medium">
                See all currency pairs <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Trusted by Users Across Africa</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                stars: 5,
                quote:
                  'I get paid in USDT for my freelance work. Coinsend lets me convert and withdraw to M-Pesa instantly. My bank used to take 3 days for international wires.',
                name: 'James M.',
                role: 'Freelance Developer, Nairobi',
                initials: 'JM',
                color: 'bg-blue-100 text-blue-600',
              },
              {
                stars: 5,
                quote:
                  'I send money home to Kenya every month from Dubai. USDT transfer fees are almost zero compared to Western Union. Coinsend makes it reach M-Pesa in minutes.',
                name: 'Fatuma A.',
                role: 'Kenyan Diaspora, Dubai',
                initials: 'FA',
                color: 'bg-primary-100 text-primary-600',
              },
              {
                stars: 5,
                quote:
                  'We pay suppliers in KES through Coinsend after receiving payments in USDT from our international clients. It has eliminated our forex headaches completely.',
                name: 'Daniel O.',
                role: 'E-commerce Business Owner',
                initials: 'DO',
                color: 'bg-purple-100 text-purple-600',
              },
            ].map(({ stars, quote, name, role, initials, color }) => (
              <div key={name} className="bg-gray-50 rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-gray-700 text-sm mb-5">"{quote}"</blockquote>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center`}>
                    <span className="font-semibold text-sm">{initials}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{name}</p>
                    <p className="text-gray-500 text-xs">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 bg-gradient-to-br from-gray-900 via-gray-900 to-primary-900 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">
            Start Using Your Stablecoins Today
          </h2>
          <p className="text-gray-300 mb-10 text-lg">
            Join thousands of freelancers, businesses, and individuals who use Coinsend to
            bridge stablecoins to Africa's mobile money network.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-10 py-4 text-base font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-400 transition-all shadow-lg shadow-primary-500/30"
          >
            Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <p className="mt-4 text-gray-500 text-sm">No sign-up fees. No minimum deposit.</p>
        </div>
      </section>

      {/* ── Support ── */}
      <section className="py-12 px-4 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
          <p className="text-gray-600 text-sm mb-4">
            Our support team is available 24/7.
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            Chat on WhatsApp
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white text-lg font-bold mb-1">Coinsend</h3>
              <p className="text-sm text-gray-500">
                Bridging stablecoins to Africa's mobile money network. Instant. Secure. Global.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/rates" className="hover:text-white transition-colors">Live Rates</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Create Account</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-3">Support</h4>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Support
              </a>
              <p className="mt-2 text-sm">{WHATSAPP_NUMBER}</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Coinsend. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
