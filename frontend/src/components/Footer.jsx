import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="mt-10 border-t border-neutral-200/70">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-10 md:grid-cols-3">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-emerald-600 flex items-center justify-center">
            <span className="font-display font-bold text-ink leading-none">R</span>
          </span>
          <span className="font-display text-xl font-bold text-neutral-900">
            Ryd<span className="text-gradient">ZO</span>
          </span>
        </div>
        <p className="mt-4 text-sm text-neutral-500 max-w-xs">
          Peer-to-peer bike rentals with verified owners, digital agreements and live tracking.
        </p>
      </div>
      <div className="flex gap-12 text-sm">
        <div className="space-y-2">
          <p className="font-semibold text-neutral-800">Ride</p>
          <Link to="/bikes" className="block text-neutral-500 hover:text-primary-300">Browse bikes</Link>
          <Link to="/register" className="block text-neutral-500 hover:text-primary-300">Sign up</Link>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-neutral-800">Own</p>
          <Link to="/register" className="block text-neutral-500 hover:text-primary-300">List your bike</Link>
          <Link to="/login" className="block text-neutral-500 hover:text-primary-300">Owner login</Link>
        </div>
      </div>
      <p className="text-xs text-neutral-500 leading-relaxed">
        RydZO is a platform that connects owners and riders. Vehicle ownership stays with the owner, and handover and
        return happen directly between owner and rider. RydZO is not responsible for vehicle condition, handover or incidents.
      </p>
    </div>
    <div className="border-t border-neutral-200/70 py-5 text-center text-xs text-neutral-500">
      © {new Date().getFullYear()} RydZO. All rights reserved.
    </div>
  </footer>
);

export default Footer;
