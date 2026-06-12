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
} from 'lucide-react';

const WHATSAPP_NUMBER = '+254768294351';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;

/* ── Inline Crypto Icons ─────────────────────── */
const UsdtIcon = ({ className = 'w-10 h-10' }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <circle cx="20" cy="20" r="20" fill="#26A17B" />
    <path d="M22.8 20.8c-.1 0-.7.1-2.8.1-1.7 0-2.4 0-2.7-.1-5.4-.2-9.4-1.3-9.4-2.5s4-2.3 9.4-2.5v4c.3 0 1.1.1 2.8.1 2 0 2.6-.1 2.7-.1v-4c5.4.2 9.4 1.3 9.4 2.5s-4 2.3-9.4 2.5zm0-5.4v-3.6h7.5V7.5H9.7v4.3h7.5v3.6C11 15.7 6.2 17 6.2 18.7c0 1.6 4.8 3 11 3.3v10.5h5.6V22c6.2-.3 11-1.6 11-3.3 0-1.6-4.8-3-11-3.3z" fill="white"/>
  </svg>
);

const UsdcIcon = ({ className = 'w-10 h-10' }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <circle cx="20" cy="20" r="20" fill="#2775CA" />
    <path d="M24.5 23.2c0-2.2-1.3-3-4-3.4-1.9-.3-2.3-.8-2.3-1.7s.7-1.5 2.1-1.5c1.3 0 1.9.4 2.2 1.5.1.2.2.3.4.3h1c.2 0 .4-.2.3-.4-.3-1.5-1.3-2.7-3-3v-1.7c0-.2-.1-.4-.4-.4h-.9c-.2 0-.4.2-.4.4v1.6c-2 .3-3.3 1.6-3.3 3.2 0 2.1 1.3 2.9 4 3.3 1.8.4 2.3.8 2.3 1.8 0 1-.9 1.7-2.2 1.7-1.7 0-2.3-.7-2.5-1.6-.1-.2-.2-.3-.4-.3h-1c-.2 0-.4.2-.3.4.3 1.7 1.4 2.8 3.4 3.1v1.7c0 .2.2.4.4.4h.9c.2 0 .4-.2.4-.4v-1.7c2.1-.3 3.3-1.7 3.3-3.4z" fill="white"/>
    <path d="M15.8 30.6c-5.8-2.1-8.8-8.5-6.7-14.4 1.1-3 3.4-5.3 6.4-6.4.2-.1.3-.3.3-.5v-.9c0-.2-.1-.4-.3-.3-.1 0-.2.1-.2.1-7 2.5-10.6 10.1-8.1 17.1 1.5 4.2 4.8 7.5 9 9 .2.1.4 0 .5-.2v-.9c-.1-.3-.2-.5-.4-.6h-.5zm9-.2c-.2-.1-.4 0-.5.2v.9c0 .2.2.4.4.4.1 0 .1 0 .2-.1 7-2.5 10.6-10.1 8.1-17.1-1.5-4.2-4.8-7.5-9-9-.2-.1-.4 0-.5.2v.9c0 .2.2.4.4.5 5.8 2.1 8.8 8.5 6.7 14.4-1.1 3-3.4 5.3-6.4 6.4-.3.1-.4.3-.4.5v.9c0 .2.2.4.4.3h.5.1z" fill="white"/>
  </svg>
);

const KesIcon = ({ className = 'w-10 h-10' }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <circle cx="20" cy="20" r="20" fill="#10B981" />
    <text x="20" y="25" textAnchor="middle" fill="white" fontWeight="bold" fontSize="14" fontFamily="Inter, sans-serif">KES</text>
  </svg>
);

const MpesaIcon = ({ className = 'w-10 h-10' }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none">
    <circle cx="20" cy="20" r="20" fill="#4CAF50" />
    <rect x="14" y="8" width="12" height="24" rx="2.5" fill="white" opacity="0.95"/>
    <rect x="15.5" y="11" width="9" height="16" rx="1" fill="#4CAF50"/>
    <circle cx="20" cy="30" r="1.2" fill="#4CAF50"/>
    <path d="M17 17l2.5 2.5L24 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Animated Exchange Arrow ─────────────────── */
const ExchangeAnimation = () => (
  <div className="relative w-full max-w-md mx-auto my-8">
    <div className="flex items-center justify-center gap-3">
      {/* USDT coin */}
      <div className="animate-float" style={{ animationDelay: '0s' }}>
        <UsdtIcon className="w-14 h-14 drop-shadow-[0_0_15px_rgba(38,161,123,0.5)]" />
      </div>
      {/* USDC coin */}
      <div className="animate-float" style={{ animationDelay: '0.5s' }}>
        <UsdcIcon className="w-11 h-11 drop-shadow-[0_0_15px_rgba(39,117,202,0.5)]" />
      </div>

      {/* Animated flow line */}
      <div className="flex-1 relative h-1 mx-2">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/30 via-accent-500/50 to-accent-500/30 rounded-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-accent-400 rounded-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        {/* Traveling dot */}
        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-[travel_2s_ease-in-out_infinite]" />
      </div>

      {/* KES coin */}
      <div className="animate-float" style={{ animationDelay: '1s' }}>
        <KesIcon className="w-11 h-11 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
      </div>
      {/* M-Pesa */}
      <div className="animate-float" style={{ animationDelay: '1.5s' }}>
        <MpesaIcon className="w-14 h-14 drop-shadow-[0_0_15px_rgba(76,175,80,0.5)]" />
      </div>
    </div>
  </div>
);

/* ── Floating Coins Background ───────────────── */
const FloatingCoins = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {/* Scattered USDT coins */}
    <div className="absolute top-[15%] left-[8%] animate-float opacity-20" style={{ animationDelay: '0s', animationDuration: '4s' }}>
      <UsdtIcon className="w-8 h-8" />
    </div>
    <div className="absolute top-[25%] right-[12%] animate-float opacity-15" style={{ animationDelay: '1s', animationDuration: '5s' }}>
      <UsdcIcon className="w-6 h-6" />
    </div>
    <div className="absolute top-[60%] left-[5%] animate-float opacity-10" style={{ animationDelay: '2s', animationDuration: '6s' }}>
      <UsdtIcon className="w-5 h-5" />
    </div>
    <div className="absolute top-[45%] right-[6%] animate-float opacity-15" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}>
      <KesIcon className="w-7 h-7" />
    </div>
    <div className="absolute top-[70%] right-[18%] animate-float opacity-10" style={{ animationDelay: '1.5s', animationDuration: '5.5s' }}>
      <UsdcIcon className="w-5 h-5" />
    </div>
    <div className="absolute top-[80%] left-[15%] animate-float opacity-10" style={{ animationDelay: '3s', animationDuration: '5s' }}>
      <KesIcon className="w-6 h-6" />
    </div>
  </div>
);


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
    <div className="min-h-screen bg-dark-900">
      <PageTitle
        title="Coinsend — Crypto Off-Ramp to M-Pesa"
        description="Convert USDT to KES instantly. Send stablecoins, receive M-Pesa. The fastest crypto off-ramp in Africa."
      />
      <Header />

      {/* ── Custom keyframes ── */}
      <style>{`
        @keyframes travel {
          0%, 100% { left: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: calc(100% - 10px); opacity: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(59,130,246,0.4)); }
          50% { filter: drop-shadow(0 0 20px rgba(59,130,246,0.7)); }
        }
        @keyframes coin-spin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 mesh-bg" />
        <div className="absolute inset-0 grid-pattern" />
        <FloatingCoins />

        {/* Glowing orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-gold-400/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent-500/8 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 pt-28 pb-16 lg:pt-36 lg:pb-20">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gold-400/10 border border-gold-400/20 px-4 py-2 rounded-full text-sm mb-8 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-gold-400" />
              <span className="text-gold-300">Instant Stablecoin ↔ M-Pesa Settlements</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              Crypto Off-Ramp for
              <span className="block gradient-text">
                Real-World Payments
              </span>
            </h1>

            <p className="text-lg md:text-xl text-surface-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              Send USDT, receive KES on M-Pesa — instantly. Whether you're getting paid globally,
              sending remittances, or running a business, Coinsend bridges stablecoins to Africa's
              payment rails.
            </p>

            {/* Animated Exchange Flow */}
            <ExchangeAnimation />

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl bg-gold-400 text-white hover:bg-gold-300 transition-all shadow-glow-gold hover:shadow-glow-gold-lg active:scale-[0.98]"
              >
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/rates"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl border border-surface-600/50 text-surface-200 hover:bg-surface-700/30 transition-all"
              >
                View Live Rates
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <div className="text-center bg-dark-800/40 backdrop-blur-sm border border-surface-700/30 rounded-2xl py-4 px-3">
                <p className="text-2xl md:text-3xl font-bold text-white">{buyRate.toFixed(0)}</p>
                <p className="text-xs text-surface-500 mt-1">KES per USDT</p>
              </div>
              <div className="text-center bg-dark-800/40 backdrop-blur-sm border border-surface-700/30 rounded-2xl py-4 px-3">
                <p className="text-2xl md:text-3xl font-bold text-white">Instant</p>
                <p className="text-xs text-surface-500 mt-1">Settlement</p>
              </div>
              <div className="text-center bg-dark-800/40 backdrop-blur-sm border border-surface-700/30 rounded-2xl py-4 px-3">
                <p className="text-2xl md:text-3xl font-bold text-white">24/7</p>
                <p className="text-xs text-surface-500 mt-1">Always On</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="relative max-w-4xl mx-auto px-4 pb-20">
          <img
            src="/images/hero-exchange.png"
            alt="USDT and USDC stablecoins converting to Kenya Shillings via M-Pesa"
            className="w-full rounded-2xl border border-surface-700/20 shadow-glass-lg"
          />
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-4 bg-dark-900 relative">
        <div className="absolute inset-0 mesh-bg opacity-50" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">How It Works</h2>
            <p className="text-surface-400">From stablecoin to spendable cash in 3 steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <UsdtIcon className="w-8 h-8" />,
                step: '1',
                title: 'Deposit USDT',
                desc: 'Send USDT (TRC-20) from any wallet — Binance, Trust Wallet, Bybit, or any exchange — to your Coinsend address.',
              },
              {
                icon: <ArrowLeftRight className="h-6 w-6 text-gold-400" />,
                step: '2',
                title: 'Instant Conversion',
                desc: 'Your USDT is converted to KES at a competitive live rate. No delays, no manual processing.',
              },
              {
                icon: <MpesaIcon className="w-8 h-8" />,
                step: '3',
                title: 'Withdraw to M-Pesa',
                desc: 'Cash out to any M-Pesa number in seconds. Pay for anything, anywhere in Kenya.',
              },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="relative bg-dark-800/60 backdrop-blur-sm border border-surface-700/30 rounded-2xl p-6 text-center hover:border-gold-400/30 transition-all duration-300 group">
                <div className="w-14 h-14 bg-dark-900/80 border border-surface-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow-sm transition-all">
                  {icon}
                </div>
                <div className="absolute -top-3 left-6 bg-gold-400 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-glow-sm">
                  {step}
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">{title}</h3>
                <p className="text-surface-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>

          {/* Supported coins badge */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <span className="text-xs text-surface-500 uppercase tracking-wider">Supported:</span>
            <div className="flex items-center gap-2 bg-dark-800/60 border border-surface-700/30 rounded-full px-4 py-2">
              <UsdtIcon className="w-5 h-5" />
              <span className="text-sm text-surface-300 font-medium">USDT</span>
              <span className="text-surface-600 mx-1">·</span>
              <UsdcIcon className="w-5 h-5" />
              <span className="text-sm text-surface-300 font-medium">USDC</span>
              <span className="text-surface-600 mx-1">→</span>
              <KesIcon className="w-5 h-5" />
              <span className="text-sm text-surface-300 font-medium">KES</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who It's For (with global map) ── */}
      <section className="py-24 px-4 bg-dark-800/30 relative">
        <div className="absolute inset-0 mesh-bg opacity-30" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">Built for Everyone Holding Stablecoins</h2>
            <p className="text-surface-400">One platform, many use cases</p>
          </div>

          {/* Global map image */}
          <div className="mb-12 relative">
            <img
              src="/images/global-map.png"
              alt="Global remittance network connecting the world to East Africa"
              className="w-full max-w-2xl mx-auto rounded-2xl opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-800/90 via-transparent to-dark-800/50 rounded-2xl" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Globe className="h-6 w-6" />,
                color: 'text-gold-400',
                bg: 'bg-gold-400/10 border-gold-400/20',
                glow: 'group-hover:border-primary-500/40',
                title: 'Freelancers & Remote Workers',
                desc: 'Get paid in USDT from clients worldwide? Convert to KES and withdraw to M-Pesa in seconds.',
              },
              {
                icon: <Repeat className="h-6 w-6" />,
                color: 'text-accent-400',
                bg: 'bg-accent-500/10 border-accent-500/20',
                glow: 'group-hover:border-accent-500/40',
                title: 'Remittances',
                desc: 'Send money home to Kenya from anywhere in the world. Use USDT to avoid expensive international transfer fees.',
              },
              {
                icon: <Building2 className="h-6 w-6" />,
                color: 'text-purple-400',
                bg: 'bg-purple-500/10 border-purple-500/20',
                glow: 'group-hover:border-purple-500/40',
                title: 'Businesses',
                desc: 'Accept or hold USDT, pay suppliers and staff in KES via M-Pesa. Hedge against local currency volatility.',
              },
              {
                icon: <Briefcase className="h-6 w-6" />,
                color: 'text-orange-400',
                bg: 'bg-orange-500/10 border-orange-500/20',
                glow: 'group-hover:border-orange-500/40',
                title: 'Crypto Traders',
                desc: 'Realized profits in stablecoins? Off-ramp USDT to KES at competitive rates without going through a bank.',
              },
              {
                icon: <Users className="h-6 w-6" />,
                color: 'text-cyan-400',
                bg: 'bg-cyan-500/10 border-cyan-500/20',
                glow: 'group-hover:border-cyan-500/40',
                title: 'Travelers & Expats',
                desc: 'In Kenya without a local bank account? Get KES on M-Pesa from your stablecoin wallet within minutes of arriving.',
              },
              {
                icon: <Landmark className="h-6 w-6" />,
                color: 'text-rose-400',
                bg: 'bg-rose-500/10 border-rose-500/20',
                glow: 'group-hover:border-rose-500/40',
                title: 'Cross-Border Payments',
                desc: 'Pay partners or suppliers across East Africa. Convert USDT to KES, UGX, TZS, NGN and more.',
              },
            ].map(({ icon, color, bg, glow, title, desc }) => (
              <div key={title} className={`bg-dark-800/40 backdrop-blur-sm border border-surface-700/30 rounded-2xl p-5 hover:bg-dark-800/60 transition-all duration-300 group ${glow}`}>
                <div className={`w-12 h-12 ${bg} border rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  {icon}
                </div>
                <h3 className="font-semibold mb-2 text-white">{title}</h3>
                <p className="text-surface-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="py-24 px-4 bg-dark-900 relative">
        <div className="absolute inset-0 mesh-bg opacity-30" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">Why Coinsend</h2>
            <p className="text-surface-400">The fastest way to spend your stablecoins in Africa</p>
          </div>

          {/* Floating coins image */}
          <div className="mb-12 flex justify-center">
            <img
              src="/images/crypto-coins.png"
              alt="USDT, USDC and KES cryptocurrency coins"
              className="w-full max-w-lg rounded-2xl"
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Zap className="h-5 w-5 text-yellow-400" />,
                bg: 'bg-yellow-500/10 border-yellow-500/20',
                title: 'Instant Settlement',
                desc: 'USDT to KES to M-Pesa in under 60 seconds. No waiting, no business-hours dependency.',
              },
              {
                icon: <TrendingUp className="h-5 w-5 text-accent-400" />,
                bg: 'bg-accent-500/10 border-accent-500/20',
                title: 'Competitive Rates',
                desc: 'Live market rates, better than banks and traditional forex bureaus. No hidden fees.',
              },
              {
                icon: <Shield className="h-5 w-5 text-gold-400" />,
                bg: 'bg-gold-400/10 border-gold-400/20',
                title: 'Secure & Trusted',
                desc: 'Your funds are protected end-to-end. Transparent transaction history at all times.',
              },
              {
                icon: <Wallet className="h-5 w-5 text-cyan-400" />,
                bg: 'bg-cyan-500/10 border-cyan-500/20',
                title: 'No Bank Account',
                desc: 'All you need is an M-Pesa number. We connect stablecoins directly to mobile money.',
              },
            ].map(({ icon, bg, title, desc }) => (
              <div key={title} className="bg-dark-800/40 backdrop-blur-sm rounded-2xl p-5 border border-surface-700/30 hover:border-surface-600/50 transition-all duration-300">
                <div className={`w-10 h-10 ${bg} border rounded-lg flex items-center justify-center mb-3`}>
                  {icon}
                </div>
                <h3 className="font-semibold mb-1 text-white">{title}</h3>
                <p className="text-surface-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── M-Pesa Bridge (with phone image) ── */}
      <section className="py-24 px-4 bg-dark-800/30 relative">
        <div className="absolute inset-0 mesh-bg opacity-30" />
        <div className="relative max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-accent-500/10 border border-accent-500/20 px-3 py-1 rounded-full text-sm text-accent-400 mb-4">
                <CheckCircle2 className="h-4 w-4" />
                Africa's Largest Mobile Money Network
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                Stablecoins Meet M-Pesa
              </h2>
              <p className="text-surface-400 mb-6">
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
                    <div className="w-6 h-6 bg-accent-500/15 border border-accent-500/20 rounded-full flex items-center justify-center shrink-0">
                      <BadgeCheck className="h-4 w-4 text-accent-400" />
                    </div>
                    <span className="text-surface-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* M-Pesa Phone Image */}
            <div className="relative flex justify-center">
              <img
                src="/images/mpesa-receive.png"
                alt="M-Pesa payment received on mobile phone showing KES balance"
                className="w-full max-w-sm rounded-2xl"
              />
              {/* Floating coin accents around the image */}
              <div className="absolute -top-4 -right-4 animate-float" style={{ animationDelay: '0s' }}>
                <UsdtIcon className="w-10 h-10 drop-shadow-[0_0_12px_rgba(38,161,123,0.5)]" />
              </div>
              <div className="absolute -bottom-3 -left-3 animate-float" style={{ animationDelay: '1s' }}>
                <KesIcon className="w-9 h-9 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
              </div>
              <div className="absolute top-1/3 -left-6 animate-float" style={{ animationDelay: '2s' }}>
                <UsdcIcon className="w-7 h-7 drop-shadow-[0_0_10px_rgba(39,117,202,0.4)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Rates ── */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-lavender-900/20 via-dark-900 to-gold-900/15" />
        <div className="absolute inset-0 mesh-bg" />
        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">Live Exchange Rates</h2>
            <p className="text-surface-400">Updated in real-time. No surprises at checkout.</p>
          </div>

          <div className="bg-dark-800/60 backdrop-blur-xl border border-surface-700/30 rounded-2xl p-6 shadow-glass">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-surface-700/20 border border-surface-600/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <UsdtIcon className="w-6 h-6" />
                    <span className="text-surface-400 text-sm">USDT → KES</span>
                  </div>
                  <span className="bg-accent-500/15 text-accent-400 text-xs px-2 py-0.5 rounded-full border border-accent-500/20">Buy</span>
                </div>
                <p className="text-3xl font-bold text-white">{buyRate.toFixed(2)}</p>
                <p className="text-surface-500 text-sm mt-1">KES per 1 USDT</p>
              </div>
              <div className="bg-surface-700/20 border border-surface-600/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <KesIcon className="w-6 h-6" />
                    <span className="text-surface-400 text-sm">KES → USDT</span>
                  </div>
                  <span className="bg-gold-400/15 text-gold-400 text-xs px-2 py-0.5 rounded-full border border-gold-400/20">Sell</span>
                </div>
                <p className="text-3xl font-bold text-white">{sellRate.toFixed(2)}</p>
                <p className="text-surface-500 text-sm mt-1">KES per 1 USDT</p>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link to="/rates" className="inline-flex items-center text-gold-400 hover:text-gold-300 font-medium transition-colors">
                See all currency pairs <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-4 bg-dark-900 relative">
        <div className="absolute inset-0 mesh-bg opacity-30" />
        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">Trusted by Users Across Africa</h2>
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
                color: 'bg-gold-400/15 text-gold-400 border-gold-400/20',
              },
              {
                stars: 5,
                quote:
                  'I send money home to Kenya every month from Dubai. USDT transfer fees are almost zero compared to Western Union. Coinsend makes it reach M-Pesa in minutes.',
                name: 'Fatuma A.',
                role: 'Kenyan Diaspora, Dubai',
                initials: 'FA',
                color: 'bg-accent-500/15 text-accent-400 border-accent-500/20',
              },
              {
                stars: 5,
                quote:
                  'We pay suppliers in KES through Coinsend after receiving payments in USDT from our international clients. It has eliminated our forex headaches completely.',
                name: 'Daniel O.',
                role: 'E-commerce Business Owner',
                initials: 'DO',
                color: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
              },
            ].map(({ stars, quote, name, role, initials, color }) => (
              <div key={name} className="bg-dark-800/60 backdrop-blur-sm border border-surface-700/30 rounded-2xl p-6 hover:border-surface-600/50 transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-surface-300 text-sm mb-5 leading-relaxed">"{quote}"</blockquote>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${color} border rounded-full flex items-center justify-center`}>
                    <span className="font-semibold text-sm">{initials}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-white">{name}</p>
                    <p className="text-surface-500 text-xs">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-lavender-900/20 via-dark-900 to-dark-900" />
        <div className="absolute inset-0 mesh-bg" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold-400/10 rounded-full blur-[150px]" />

        <div className="relative max-w-2xl mx-auto text-center">
          {/* Floating coins animation */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="animate-float" style={{ animationDelay: '0s' }}>
              <UsdtIcon className="w-12 h-12 drop-shadow-[0_0_15px_rgba(38,161,123,0.4)]" />
            </div>
            <div className="animate-float" style={{ animationDelay: '0.7s' }}>
              <UsdcIcon className="w-10 h-10 drop-shadow-[0_0_15px_rgba(39,117,202,0.4)]" />
            </div>
            <ArrowRight className="h-6 w-6 text-surface-500 mx-2" />
            <div className="animate-float" style={{ animationDelay: '1.4s' }}>
              <MpesaIcon className="w-12 h-12 drop-shadow-[0_0_15px_rgba(76,175,80,0.4)]" />
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-5 text-white tracking-tight">
            Start Using Your Stablecoins Today
          </h2>
          <p className="text-surface-400 mb-10 text-lg">
            Join thousands of freelancers, businesses, and individuals who use Coinsend to
            bridge stablecoins to Africa's mobile money network.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-10 py-4 text-base font-semibold rounded-xl bg-gold-400 text-white hover:bg-gold-300 transition-all shadow-glow-gold hover:shadow-glow-gold-lg active:scale-[0.98]"
          >
            Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <p className="mt-4 text-surface-600 text-sm">No sign-up fees. No minimum deposit.</p>
        </div>
      </section>

      {/* ── Support ── */}
      <section className="py-12 px-4 bg-dark-900 border-t border-surface-700/30">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="font-semibold text-lg mb-2 text-white">Need Help?</h3>
          <p className="text-surface-400 text-sm mb-4">
            Our support team is available 24/7.
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-accent-500/15 border border-accent-500/20 hover:bg-accent-500/25 text-accent-400 px-6 py-3 rounded-xl font-medium transition-all"
          >
            <MessageCircle className="h-5 w-5" />
            Chat on WhatsApp
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-4 bg-dark-950 border-t border-surface-700/20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white text-lg font-bold mb-1">Coinsend</h3>
              <p className="text-sm text-surface-500 mb-3">
                Bridging stablecoins to Africa's mobile money network. Instant. Secure. Global.
              </p>
              {/* Supported tokens */}
              <div className="flex items-center gap-2">
                <UsdtIcon className="w-5 h-5" />
                <UsdcIcon className="w-5 h-5" />
                <KesIcon className="w-5 h-5" />
                <MpesaIcon className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h4 className="text-surface-200 font-medium mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/rates" className="text-surface-500 hover:text-surface-300 transition-colors">Live Rates</Link></li>
                <li><Link to="/register" className="text-surface-500 hover:text-surface-300 transition-colors">Create Account</Link></li>
                <li><Link to="/login" className="text-surface-500 hover:text-surface-300 transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-surface-200 font-medium mb-3">Support</h4>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 transition-colors text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Support
              </a>
              <p className="mt-2 text-sm text-surface-500">{WHATSAPP_NUMBER}</p>
            </div>
          </div>
          <div className="border-t border-surface-700/20 pt-6 text-center text-sm text-surface-600">
            <p>&copy; {new Date().getFullYear()} Coinsend. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
