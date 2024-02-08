"use client"

import Link from 'next/link';
import React from 'react'
import { Nav } from './components/Navbar';
import { OutlineBtn, PrimaryBtn } from './components/Buttons';
import Lottie from 'react-lottie-player';
import animationData from './lottie/report-inspector.json';
import { useRouter } from 'next/navigation'

function Home() {
  const router = useRouter();

  return (
    <>
      <Nav>
        <Link href="/login">Login</Link>
        <Link href="/login">Sign Up</Link>
        <Link href="/reports">Reports</Link>
      </Nav>
      <div className="m-10 z-10">
        <div>
          <h1 className="font-bold text-center text-xl mb-1">Reporting Reimagined. Professional Surveys, Streamlined.</h1>
          <p className="hidden text-sm">We revolutionize professional surveying by seamlessly blending advanced automation with simplicity, enabling swift, precise reporting that sets a new standard in the industry.</p>
        </div>
        <div className="mt-5 mb-5 flex justify-center">
          <PrimaryBtn onClick={() => router.push("/login")}>Get Started</PrimaryBtn>
        </div>
        <div className="-z-10 relative bottom-20 right-10 h-[350px]">
          <Lottie animationData={animationData} play speed={1} style={{ width: 400, height: 400 }} />
        </div>
        <h2 className='hidden'>Features</h2>
      </div>
    </>
  )
}

export default Home;