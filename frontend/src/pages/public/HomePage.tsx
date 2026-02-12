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
  BadgeCheck,
  Banknote,
  Star,
  Plane,
  Briefcase,
  Globe,
  Users,
  CreditCard,
  MapPin,
} from 'lucide-react';

const WHATSAPP_NUMBER = '+254768294351';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}`;

const HomePage = () => {
  const [sellRate, setSellRate] = useState<number>(130); // Default fallback
  const [buyRate, setBuyRate] = useState<number>(132); // Default fallback

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
        // Keep default fallback rates on error
        console.error('Failed to fetch rates:', err);
      }
    };
    fetchRates();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <PageTitle title="" description="Convert crypto to Kenya Shillings instantly. Perfect for tourists, travelers & freelancers. No bank account needed. Get M-Pesa cash in seconds." />
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
              <Plane className="h-4 w-4 text-primary-400" />
              <span className="text-primary-300">Trusted by Travelers & Locals Across Kenya</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Arrive with Crypto,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-300">
                Spend in Kenya
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Convert your USDT to Kenya Shillings instantly. No bank account needed.
              Get M-Pesa mobile money and pay anywhere in Kenya within seconds.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30"
              >
                Convert Now <ArrowRight className="ml-2 h-5 w-5" />
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
                  {buyRate.toFixed(0)}
                </p>
                <p className="text-xs text-gray-400">KES per USDT</p>
              </div>
              <div className="text-center border-x border-gray-700">
                <p className="text-2xl md:text-3xl font-bold text-white">Instant</p>
                <p className="text-xs text-gray-400">Conversion</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white">24/7</p>
                <p className="text-xs text-gray-400">Available</p>
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

      {/* Perfect For Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Perfect For</h2>
            <p className="text-gray-600">Whether you're visiting or living in Kenya</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Plane className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-1">Tourists</h3>
              <p className="text-gray-600 text-sm">
                Visiting Kenya? Convert crypto to KES without needing a local bank account
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-1">Business Travelers</h3>
              <p className="text-gray-600 text-sm">
                In Kenya for work? Get local currency instantly for expenses
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-1">Digital Nomads</h3>
              <p className="text-gray-600 text-sm">
                Working remotely in Kenya? Convert your crypto earnings to cash
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-1">Freelancers</h3>
              <p className="text-gray-600 text-sm">
                Receive crypto payments? Convert to KES and withdraw to M-Pesa
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Simple */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-gray-600">Get Kenya Shillings in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="relative bg-white rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-6 w-6 text-primary-600" />
              </div>
              <div className="absolute -top-3 left-6 bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2">Send USDT</h3>
              <p className="text-gray-600 text-sm">
                Transfer USDT from any wallet to your Coinsend deposit address (TRC-20)
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-white rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ArrowDownLeft className="h-6 w-6 text-primary-600" />
              </div>
              <div className="absolute -top-3 left-6 bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2">Auto-Convert</h3>
              <p className="text-gray-600 text-sm">
                Your USDT is instantly converted to KES at the best available rate
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-white rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-6 w-6 text-primary-600" />
              </div>
              <div className="absolute -top-3 left-6 bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2">Get M-Pesa Cash</h3>
              <p className="text-gray-600 text-sm">
                Withdraw to any M-Pesa number and pay anywhere in Kenya
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why M-Pesa */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full text-sm text-green-700 mb-4">
                <MapPin className="h-4 w-4" />
                Accepted Everywhere in Kenya
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Why M-Pesa is Your Best Option
              </h2>
              <p className="text-gray-600 mb-6">
                M-Pesa is Kenya's most widely accepted payment method. From street vendors to luxury hotels,
                supermarkets to safari lodges - M-Pesa works everywhere. No need to carry cash or worry about
                finding ATMs.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <BadgeCheck className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Accepted at 90%+ of Kenyan businesses</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <BadgeCheck className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Pay for hotels, safaris, restaurants & transport</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <BadgeCheck className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Works with any Safaricom SIM card</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <BadgeCheck className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Withdraw cash at any M-Pesa agent</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-white">
              <div className="text-center">
                <Smartphone className="h-16 w-16 mx-auto mb-4 opacity-90" />
                <h3 className="text-xl font-bold mb-2">Get a Safaricom SIM</h3>
                <p className="text-green-100 text-sm mb-4">
                  Tourist SIM cards are available at JKIA airport and any Safaricom shop.
                  Registration takes 5 minutes with your passport.
                </p>
                <div className="bg-white/20 rounded-xl p-4">
                  <p className="text-sm font-medium">Once registered, we send KES directly to your M-Pesa!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Choose Coinsend</h2>
            <p className="text-gray-600">Built for travelers and locals alike</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold mb-1">Instant Conversion</h3>
              <p className="text-gray-600 text-sm">
                USDT to KES in seconds. No waiting, no delays.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-1">No Bank Account</h3>
              <p className="text-gray-600 text-sm">
                Just need an M-Pesa number. Perfect for tourists.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <Banknote className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-1">Best Rates</h3>
              <p className="text-gray-600 text-sm">
                Competitive rates, better than airport exchanges.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="font-semibold mb-1">Safe & Secure</h3>
              <p className="text-gray-600 text-sm">
                256-bit encryption. Your funds are always protected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">What Travelers Say</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-2xl p-6">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <blockquote className="text-gray-700 mb-4">
                "Landed in Nairobi with USDT. Within 10 minutes of getting my Safaricom SIM,
                I had KES in my M-Pesa and was paying for my Uber. Incredible!"
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">MK</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Michael K.</p>
                  <p className="text-gray-500 text-xs">Tourist from Germany</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <blockquote className="text-gray-700 mb-4">
                "I work remotely and get paid in crypto. Coinsend makes it so easy to convert to KES
                whenever I need to. Way better rates than traditional exchanges."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">SA</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Sarah A.</p>
                  <p className="text-gray-500 text-xs">Digital Nomad, Nairobi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rates Preview */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Live Exchange Rates</h2>
            <p className="text-primary-100">Better rates than airport forex bureaus</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-primary-100 text-sm">You Send</span>
                  <span className="bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full">USDT → KES</span>
                </div>
                <p className="text-3xl font-bold">{buyRate.toFixed(2)} KES</p>
                <p className="text-primary-200 text-sm mt-1">per 1 USDT</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-primary-100 text-sm">You Send</span>
                  <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full">KES → USDT</span>
                </div>
                <p className="text-3xl font-bold">{sellRate.toFixed(2)} KES</p>
                <p className="text-primary-200 text-sm mt-1">per 1 USDT</p>
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
            Whether you're a tourist exploring Kenya or a local receiving crypto payments,
            Coinsend makes conversion simple. Create your free account in 30 seconds.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-lg"
          >
            Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <p className="mt-4 text-gray-500 text-sm">
            No fees to sign up. No minimum deposit. Works worldwide.
          </p>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-12 px-4 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="font-semibold text-lg mb-2">Need Help?</h3>
          <p className="text-gray-600 text-sm mb-4">
            Our support team is available 24/7 to assist travelers and locals.
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
                Kenya's trusted crypto-to-cash platform for travelers and locals.
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
