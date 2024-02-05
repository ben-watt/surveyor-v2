"use client"

import Link from 'next/link';
import React from 'react'


function Home() {
  return (
    <>
      <div>Report Creator</div>
      <Link href="/login">Reports</Link>
    </>
  )
}

export default Home;