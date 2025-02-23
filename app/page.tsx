"use client"

import React from 'react'
import { NavContainer } from './app/components/Navbar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';


function FrontPage() {
  return (
    <div>
      <NavContainer />
      <div className="m-10 z-10">
        <div>
          <h1 className="font-bold text-center text-xl mb-1">Reporting Reimagined. Professional Surveys, Streamlined.</h1>
          <p className="hidden text-sm">We revolutionize professional surveying by seamlessly blending advanced automation with simplicity, enabling swift, precise reporting that sets a new standard in the industry.</p>
        </div>
        <div className="mt-5 mb-5 flex justify-center">
          <Link href="/login">
            <Button variant="default">Get Started</Button>
          </Link>
        </div>
        <h2 className='hidden'>Features</h2>
      </div>
    </div>
  )
}

export default FrontPage;