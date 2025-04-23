"use client"

import React from 'react'
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle2, BarChart3, Zap, Shield } from 'lucide-react';
import { AppIcon } from '@/app/home/components/AppIcon';

function FrontPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header Section */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8">
                <AppIcon color="hsl(var(--primary))" />
              </div>
              <span className="text-xl font-semibold text-gray-900">Survii</span>
            </Link>
            <div>
              <Link href="/login">
                <Button variant="default" className="text-base">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Coming Soon
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
              Professional Surveys,{' '}
              <span className="text-primary">Streamlined</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8 px-4 sm:px-0">
              Survii revolutionizes your surveying process with advanced automation and precision. Create, manage, and analyze surveys with unprecedented ease.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg">
                  Get Started Free
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg opacity-50 cursor-not-allowed"
                disabled
              >
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Powerful Features</h2>
            <p className="text-lg sm:text-xl text-gray-600">Everything you need to create professional surveys</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="p-5 sm:p-6 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Easy Creation</h3>
              <p className="text-sm sm:text-base text-gray-600">Intuitive interface for quick survey creation and customization</p>
            </div>
            
            <div className="p-5 sm:p-6 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-sm sm:text-base text-gray-600">Comprehensive insights and data visualization tools</p>
            </div>
            
            <div className="p-5 sm:p-6 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Fast Processing</h3>
              <p className="text-sm sm:text-base text-gray-600">Quick response times and efficient data handling</p>
            </div>
            
            <div className="p-5 sm:p-6 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-sm sm:text-base text-gray-600">Enterprise-grade security and data protection</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Ready to Transform Your Survey Process?</h2>
          <p className="text-lg sm:text-xl text-primary-foreground/90 mb-6 sm:mb-8">
            Join the many professionals who trust Survii for their surveying needs
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

export default FrontPage;