'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  BarChart3,
  Zap,
  Shield,
  Camera,
  MapPin,
  FileText,
  Users,
  Clock,
  Star,
  ArrowRight,
  Building2,
  Smartphone,
} from 'lucide-react';
import { AppIcon } from '@/app/home/components/AppIcon';

function FrontPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Background visuals */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="bg-grid-slate mask-radial-faded absolute inset-0"></div>
        <div className="orb left-10 top-10 h-72 w-72 bg-gradient-to-r from-blue-400/40 to-purple-400/40"></div>
        <div className="orb -top-10 right-20 h-80 w-80 bg-gradient-to-r from-pink-400/40 to-orange-400/40"></div>
        <div className="orb -bottom-24 left-24 h-80 w-80 bg-gradient-to-r from-green-400/40 to-blue-400/40"></div>
        <div className="orb bottom-10 right-10 h-56 w-56 bg-gradient-to-r from-indigo-400/40 to-cyan-400/40"></div>
      </div>

      {/* Header Section */}
      <header className="glass-header relative z-10 border-b">
        <div className="container-7xl">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
              <div className="h-8 w-8">
                <AppIcon color="hsl(var(--primary))" />
              </div>
              <span className="text-gradient-brand text-xl font-bold">Survii</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-base font-medium">
                  Log in
                </Button>
              </Link>
              <Link href="/login">
                <Button className="cta-primary btn-shine text-base">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-y relative z-10">
        <div className="container-7xl">
          <div className="text-center">
            <Badge
              variant="secondary"
              className="mb-8 inline-flex items-center gap-2 border-0 bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 text-sm font-medium text-blue-800"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-600 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600"></span>
              </span>
              Coming Soon - Offline-First Surveying
            </Badge>

            <h1 className="mb-6 text-4xl font-bold leading-tight sm:mb-8 sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                Property Surveys
              </span>
              <br />
              <span className="text-gradient-brand">Made Simple</span>
            </h1>

            <p className="mx-auto mb-8 max-w-4xl text-xl leading-relaxed text-gray-600 sm:mb-12 sm:text-2xl">
              The professional surveyor's toolkit. Work offline, sync everywhere.
              <span className="font-semibold text-gray-800">
                {' '}
                Create detailed property reports
              </span>{' '}
              with photos, measurements, and comprehensive documentation.
            </p>

            <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/login">
                <Button
                  size="lg"
                  className="cta-primary btn-shine w-full transform px-8 py-4 text-lg transition-all duration-200 hover:-translate-y-1 sm:w-auto"
                >
                  Start Surveying Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-2 px-8 py-4 text-lg transition-all duration-200 hover:bg-gray-50 sm:w-auto"
              >
                <Camera className="mr-2 h-5 w-5" />
                View Sample Reports
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span>Works Offline</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span>Multi-Tenant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-y relative z-10 bg-white">
        <div className="container-7xl">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4 px-3 py-1">
              Built for Professionals
            </Badge>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Everything You Need for Property Surveys
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-gray-600">
              From initial property assessment to comprehensive reporting, Survii handles every
              aspect of your surveying workflow.
            </p>
          </div>

          <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="card-elevated card-gradient glass-card hover-lift-md group">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 transition-transform duration-300 group-hover:scale-110">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Photo Documentation</CardTitle>
                <CardDescription className="text-base">
                  Capture and organize property photos with automatic geotagging and categorization
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elevated card-gradient glass-card hover-lift-md group">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 transition-transform duration-300 group-hover:scale-110">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Rich Text Reports</CardTitle>
                <CardDescription className="text-base">
                  Create detailed reports with our advanced editor featuring templates and
                  auto-formatting
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elevated card-gradient glass-card hover-lift-md group">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 transition-transform duration-300 group-hover:scale-110">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Offline-First Design</CardTitle>
                <CardDescription className="text-base">
                  Work anywhere, even without internet. All data syncs automatically when connected
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elevated card-gradient glass-card hover-lift-md group">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 transition-transform duration-300 group-hover:scale-110">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Location Intelligence</CardTitle>
                <CardDescription className="text-base">
                  Integrated mapping and GPS tracking for precise property location and boundary
                  documentation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elevated card-gradient glass-card hover-lift-md group">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 transition-transform duration-300 group-hover:scale-110">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Team Collaboration</CardTitle>
                <CardDescription className="text-base">
                  Multi-tenant architecture with role-based access and real-time collaboration
                  features
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="card-elevated card-gradient glass-card hover-lift-md group">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 transition-transform duration-300 group-hover:scale-110">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">Enterprise Security</CardTitle>
                <CardDescription className="text-base">
                  Bank-grade encryption, audit trails, and compliance with industry standards
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Benefits Section */}
          <div className="rounded-3xl bg-gradient-to-r from-gray-50 to-blue-50/50 p-8 sm:p-12">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div>
                <h3 className="mb-6 bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-3xl font-bold text-transparent">
                  Why Surveyors Choose Survii
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="mb-1 font-semibold text-gray-900">Save 3+ Hours Per Survey</h4>
                      <p className="text-gray-600">
                        Streamlined workflows and automation reduce manual data entry and report
                        generation time
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="mb-1 font-semibold text-gray-900">Work Anywhere, Anytime</h4>
                      <p className="text-gray-600">
                        Offline-first architecture means you're never blocked by poor connectivity
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="mb-1 font-semibold text-gray-900">
                        Professional Results Every Time
                      </h4>
                      <p className="text-gray-600">
                        Consistent, high-quality reports that impress clients and meet industry
                        standards
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="rotate-2 transform rounded-2xl bg-white p-6 shadow-2xl">
                  <div className="mb-4 h-4 rounded-t-lg bg-gradient-to-r from-blue-500 to-purple-600"></div>
                  <div className="space-y-3">
                    <div className="h-3 w-3/4 rounded bg-gray-200"></div>
                    <div className="h-3 w-1/2 rounded bg-gray-200"></div>
                    <div className="h-20 rounded bg-gray-100"></div>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 rounded bg-blue-100"></div>
                      <div className="h-8 w-8 rounded bg-green-100"></div>
                      <div className="h-8 w-8 rounded bg-purple-100"></div>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-4 top-4 -rotate-6 transform rounded-xl bg-white p-4 shadow-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Auto-saved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="section-y relative z-10 bg-gray-50">
        <div className="container-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-3xl font-bold text-transparent">
              Trusted by Professional Surveyors
            </h2>
            <p className="text-xl text-gray-600">
              Join the growing community of professionals modernizing their workflow
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Card className="card-elevated card-gradient glass-card">
              <CardHeader>
                <div className="mb-2 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardDescription className="text-base leading-relaxed">
                  "Survii has revolutionized how we handle property surveys. The offline capability
                  is a game-changer for remote locations."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                    <span className="text-sm font-semibold text-white">MJ</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Mike Johnson</p>
                    <p className="text-sm text-gray-600">Senior Building Surveyor</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated card-gradient glass-card">
              <CardHeader>
                <div className="mb-2 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardDescription className="text-base leading-relaxed">
                  "The report generation features save us hours every week. Professional output that
                  clients love."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-teal-600">
                    <span className="text-sm font-semibold text-white">SC</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Sarah Chen</p>
                    <p className="text-sm text-gray-600">Property Assessment Lead</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated card-gradient glass-card">
              <CardHeader>
                <div className="mb-2 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <CardDescription className="text-base leading-relaxed">
                  "Finally, a surveying app built by people who understand the industry. The team
                  collaboration features are excellent."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-600">
                    <span className="text-sm font-semibold text-white">DR</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">David Rodriguez</p>
                    <p className="text-sm text-gray-600">Commercial Survey Director</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-y bg-gradient-brand relative z-10 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-purple-800/90"></div>
          <div className="bg-grid-white absolute inset-0 opacity-40"></div>
          <div className="orb right-10 top-6 h-44 w-44 bg-gradient-to-r from-white/20 to-white/5"></div>
          <div className="orb bottom-6 left-10 h-56 w-56 bg-gradient-to-r from-white/15 to-white/5"></div>
        </div>

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Ready to Transform Your
            <span className="block text-yellow-300">Survey Workflow?</span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl leading-relaxed text-blue-100">
            Join professional surveyors who have already modernized their workflow with Survii's
            offline-first platform. Start your free trial today.
          </p>

          <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login">
              <Button
                size="lg"
                className="cta-on-dark btn-shine w-full transform px-8 py-4 text-lg font-semibold transition-all duration-200 hover:-translate-y-1 sm:w-auto"
              >
                Start Free Trial Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="cta-outline-on-dark btn-shine w-full px-8 py-4 text-lg transition-all duration-200 sm:w-auto"
            >
              <Camera className="mr-2 h-5 w-5" />
              See It In Action
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-300" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-300" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-300" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-900 py-12 text-white">
        <div className="container-7xl">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mb-4 flex items-center gap-2 md:mb-0">
              <div className="h-8 w-8">
                <AppIcon color="white" />
              </div>
              <span className="text-xl font-bold">Survii</span>
            </div>
            <div className="text-sm text-gray-400">
              © 2025 Survii. Professional surveying made simple.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default FrontPage;
