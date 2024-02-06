"use client"

import Link from 'next/link';
import React from 'react'
import { Nav } from './components/Navbar';
import { OutlineBtn, PrimaryBtn } from './components/Buttons';


function Home() {
  return (
    <>
      <Nav>
        <Link href="/login">Login</Link>
        <Link href="/login">Sign Up</Link>
        <Link href="/reports">Reports</Link>
      </Nav>
      <div className="m-5">
        <div className="">
          <h1 className="font-bold text-xl mb-1">Constructing Clarity from Complexity.</h1>
          <p className="text-sm">Discover the power of simplicity with [Company Name]. Our advanced tools distill dense building reports into clear, actionable insights, illuminating your path to project success. Experience the ease of informed decision-making with our streamlined reports.</p>
        </div>
        <div className="mt-5 mb-5 flex gap-3">
          <PrimaryBtn>Get Started</PrimaryBtn>
          <OutlineBtn>Go Away</OutlineBtn>
        </div>
      </div>
      <div>
        <img className="hidden md:visible" src="https://via.placeholder.com/150" alt="placeholder" />
      </div>
    </>
  )
}

export default Home;