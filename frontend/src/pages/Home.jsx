import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';
import { FiShield, FiMapPin, FiFileText, FiCheckCircle, FiArrowRight, FiStar } from 'react-icons/fi';

const FEATURES = [
  { icon: FiShield, title: 'Verified Users', text: 'Every owner and rider is verified with documents and admin approval.' },
  { icon: FiMapPin, title: 'Live Tracking', text: 'Real-time GPS tracking during the rental with geo-fencing.' },
  { icon: FiFileText, title: 'Fully Transparent', text: 'See bike documents, insurance status and owner details before you book.' },
  { icon: FiCheckCircle, title: 'Digital Agreement', text: 'A clear digital rental agreement protects both sides on every ride.' },
];

const STEPS = [
  { title: 'Get Verified', text: 'Upload your licence and ID. Our team approves you quickly.' },
  { title: 'Browse & Book', text: 'Pick a bike, check its documents and send a booking request.' },
  { title: 'Ride & Return', text: 'Meet the owner, accept the agreement, ride, and return.' },
];

const bikeImage = (bike) => bike?.images?.frontView || bike?.images?.sideView || bike?.images?.backView;

const Home = () => {
  const [bikes, setBikes] = useState([]);

  useEffect(() => {
    api.get('/api/bikes')
      .then((res) => setBikes((res.data || []).filter(bikeImage).slice(0, 3)))
      .catch(() => setBikes([]));
  }, []);

  const [hero, ...others] = bikes;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-[-10%] w-[36rem] h-[36rem] rounded-full bg-primary-500/20 blur-3xl" />
          <div className="absolute top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: 'linear-gradient(rgb(255 255 255) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)'
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-20 md:pt-24 md:pb-28 grid lg:grid-cols-2 gap-14 items-center">
          <div className="animate-fade-up text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-300 text-xs font-semibold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
              Peer-to-peer bike rentals
            </span>
            <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] text-neutral-900">
              Explore more.<br />
              Pay less.<br />
              <span className="text-gradient">Ride easy.</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-600 max-w-xl mx-auto lg:mx-0">
              Rent verified bikes straight from local owners, with digital agreements, insurance status upfront and live ride tracking.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/bikes" className="btn-primary text-lg px-8 py-4">
                Rent a Bike <FiArrowRight />
              </Link>
              <Link to="/register" className="btn-secondary text-lg px-8 py-4">
                Become an Owner
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-8 justify-center lg:justify-start text-sm">
              <div>
                <p className="font-display text-2xl font-bold text-neutral-900">100%</p>
                <p className="text-neutral-500">Verified owners</p>
              </div>
              <div className="w-px h-10 bg-neutral-200" />
              <div>
                <p className="font-display text-2xl font-bold text-neutral-900">Hourly</p>
                <p className="text-neutral-500">or daily plans</p>
              </div>
              <div className="w-px h-10 bg-neutral-200" />
              <div>
                <p className="font-display text-2xl font-bold text-neutral-900">10%</p>
                <p className="text-neutral-500">flat platform fee</p>
              </div>
            </div>
          </div>

          {/* Live bikes preview */}
          <div className="relative hidden sm:block animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="absolute -inset-6 bg-gradient-to-tr from-primary-500/20 to-transparent rounded-[2rem] blur-2xl" />
            {hero ? (
              <div className="relative">
                <Link to={`/bikes/${hero._id}`} className="block card !p-3 hover:shadow-glow">
                  <img src={bikeImage(hero)} alt={`${hero.brand} ${hero.model}`} className="w-full h-72 object-cover rounded-xl" />
                  <div className="flex items-center justify-between px-2 pt-4 pb-1">
                    <div>
                      <p className="font-display text-lg font-semibold text-neutral-900">{hero.brand} {hero.model}</p>
                      <p className="text-sm text-neutral-500 truncate max-w-[16rem]">{hero.handoverLocation?.address || 'Available now'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-2xl font-bold text-primary-400">₹{hero.pricing?.hourly}<span className="text-sm text-neutral-500 font-sans">/hr</span></p>
                    </div>
                  </div>
                </Link>
                {others.length > 0 && (
                  <div className="absolute -bottom-20 -left-8 flex gap-3 animate-float">
                    {others.map((bike) => (
                      <Link key={bike._id} to={`/bikes/${bike._id}`} className="glass rounded-2xl p-2 pr-4 flex items-center gap-3 shadow-card hover:border-primary-500/50">
                        <img src={bikeImage(bike)} alt="" className="w-14 h-14 rounded-xl object-cover" />
                        <div className="text-xs">
                          <p className="font-semibold text-neutral-900 truncate max-w-[8rem]">{bike.brand} {bike.model}</p>
                          <p className="text-primary-400 font-bold">₹{bike.pricing?.daily}/day</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative card h-96 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-primary-500/15 flex items-center justify-center">
                  <FiStar className="text-primary-400 text-2xl" />
                </div>
                <p className="font-display text-xl font-semibold text-neutral-900">Bikes near you</p>
                <p className="text-neutral-500 text-sm max-w-xs">Scooters, commuters and cruisers from verified local owners.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-primary-400 font-semibold text-sm uppercase tracking-widest">Why RydZO</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold text-neutral-900">Built on trust, made for riders</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card group hover:-translate-y-1 hover:border-primary-500/40 hover:shadow-glow">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/25 to-emerald-500/5 border border-primary-500/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Icon className="text-primary-300 text-xl" />
                </div>
                <h3 className="font-display text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
                <p className="text-neutral-600 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-primary-400 font-semibold text-sm uppercase tracking-widest">How it works</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold text-neutral-900">On the road in 3 steps</h2>
          </div>
          <div className="relative grid md:grid-cols-3 gap-6">
            <div className="hidden md:block absolute top-7 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative text-center px-4">
                <div className="relative mx-auto w-14 h-14 rounded-2xl bg-ink border border-primary-500/40 shadow-glow flex items-center justify-center font-display text-xl font-bold text-primary-300">
                  {i + 1}
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-neutral-900">{step.title}</h3>
                <p className="mt-2 text-neutral-600 text-sm">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Owner CTA */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-primary-500/30 bg-gradient-to-br from-primary-900/60 via-ink to-ink p-10 md:p-14">
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-primary-500/25 blur-3xl" />
            <div className="relative md:flex items-center justify-between gap-10">
              <div className="max-w-xl">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900">Your bike sits idle? Let it earn.</h2>
                <p className="mt-3 text-neutral-600">List it in minutes, approve every request yourself and get paid directly by riders.</p>
              </div>
              <Link to="/register" className="btn-primary mt-8 md:mt-0 text-lg px-8 py-4 whitespace-nowrap">
                Start earning <FiArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
