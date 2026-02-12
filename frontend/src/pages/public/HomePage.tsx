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
  ArrowDownLeft,
  Clock,
  BadgeCheck,
  Banknote,
  Star,
} from 'lucide-react';

const WHATSAPP_NUMBER = '+254768294351';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;

const HomePage = () => {
  const [sellRate, setSellRate] = useState<number | null>(null);
  const [buyRate, setBuyRate] = useState<number | null>(null);

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
      } catch (err) {
        console.error('Failed to fetch rates:', err);
      }
    };
    fetchRates();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PageTitle title="" description="Convert USDT to KES instantly. Deposit crypto, withdraw to M-Pesa. Kenya's most trusted crypto-to-cash platform." />
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-primary-900">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="text-center max-w-3xl mx-auto">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 px-4 py-2 rounded-full text-sm mb-8">
              <BadgeCheck className="h-4 w-4 text-primary-400" />
              <span className="text-primary-300">Trusted by 10,000+ Kenyans</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Your Crypto,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-300">
                Your M-Pesa
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Convert USDT to KES in seconds. Deposit crypto, withdraw to M-Pesa anytime.
              No delays. No hidden fees. Just fast, reliable cash.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30"
              >
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/rates"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl border border-gray-700 text-white hover:bg-white/5 transition-all"
              >
                View Rates
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white">
                  {sellRate ? sellRate.toFixed(1) : '---'}
                </p>
                <p className="text-xs text-gray-400">USDT/KES Rate</p>
              </div>
              <div className="text-center border-x border-gray-700">
                <p className="text-2xl md:text-3xl font-bold text-white">Instant</p>
                <p className="text-xs text-gray-400">Withdrawals</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white">24/7</p>
                <p className="text-xs text-gray-400">Support</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60V30C240 10 480 0 720 10C960 20 1200 40 1440 30V60H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* How It Works - Simple */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-gray-600">Three simple steps to cash out your crypto</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="relative bg-gray-50 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-6 w-6 text-primary-600" />
              </div>
              <div className="absolute -top-3 left-6 bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2">Deposit USDT</h3>
              <p className="text-gray-600 text-sm">
                Send USDT (TRC-20) to your personal deposit address
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-gray-50 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ArrowDownLeft className="h-6 w-6 text-primary-600" />
              </div>
              <div className="absolute -top-3 left-6 bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2">Get KES Instantly</h3>
              <p className="text-gray-600 text-sm">
                Your balance is credited in KES at the best rates
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-gray-50 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-6 w-6 text-primary-600" />
              </div>
              <div className="absolute -top-3 left-6 bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2">Withdraw to M-Pesa</h3>
              <p className="text-gray-600 text-sm">
                Cash out anytime directly to your M-Pesa
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Kenyans Trust Us</h2>
            <p className="text-gray-600">Built for speed, security, and simplicity</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold mb-1">Lightning Fast</h3>
              <p className="text-gray-600 text-sm">
                Deposits credit instantly. Withdrawals hit your M-Pesa in seconds.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-1">Bank-Grade Security</h3>
              <p className="text-gray-600 text-sm">
                256-bit encryption. Your funds and data are always protected.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <Banknote className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-1">Best Rates</h3>
              <p className="text-gray-600 text-sm">
                Competitive USDT/KES rates with zero hidden fees.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="font-semibold mb-1">24/7 Support</h3>
              <p className="text-gray-600 text-sm">
                Real humans ready to help via WhatsApp anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial / Social Proof */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
          <blockquote className="text-xl md:text-2xl font-medium text-gray-900 mb-4">
            "Finally, a platform that just works. I converted 500 USDT and had the money in my M-Pesa in 3 minutes. No stress, no drama."
          </blockquote>
          <p className="text-gray-600">
            — James K., Nairobi
          </p>
        </div>
      </section>

      {/* Rates Preview */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Live Exchange Rates</h2>
            <p className="text-primary-100">Updated every minute. What you see is what you get.</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-primary-100 text-sm">USDT → KES</span>
                  <span className="bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full">Sell</span>
                </div>
                <p className="text-3xl font-bold">{sellRate ? sellRate.toFixed(2) : '---'}</p>
                <p className="text-primary-200 text-sm mt-1">per USDT</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-primary-100 text-sm">KES → USDT</span>
                  <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full">Buy</span>
                </div>
                <p className="text-3xl font-bold">{buyRate ? buyRate.toFixed(2) : '---'}</p>
                <p className="text-primary-200 text-sm mt-1">per USDT</p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/rates"
                className="inline-flex items-center text-white hover:text-primary-100 font-medium"
              >
                View all rates <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Convert Your Crypto?
          </h2>
          <p className="text-gray-600 mb-8">
            Join thousands of Kenyans who trust Coinsend for fast, secure crypto-to-cash conversions.
            Create your free account in 30 seconds.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-lg"
          >
            Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <p className="mt-4 text-gray-500 text-sm">
            No fees to sign up. No minimum deposit.
          </p>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-12 px-4 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
          <p className="text-gray-600 text-sm mb-4">
            Our support team is available 24/7 to assist you.
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

      {/* Footer */}
      <footer className="py-10 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-white text-lg font-bold mb-1">Coinsend</h3>
              <p className="text-sm text-gray-500">
                Kenya's trusted crypto-to-cash platform.
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
