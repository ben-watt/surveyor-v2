"use client"

import React from 'react'
import Navbar from '../components/Navbar';
import Doc from '../reports/building-survey-reports/Doc';


function Home() {
  return (
    <>
      <div className="container mx-auto px-5 ">
        <div className="flex justify-center">
          <h1 className="text-4xl dark:text-white m-10">Building Survey Report</h1>
        </div>
        <Doc />
      </div>
    </>
  )
}

export default Home;