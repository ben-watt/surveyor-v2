import React from 'react'
import Image from 'next/image'


export default function Home() {
  return (
    <>
      <div className="container mx-auto px-5 xl:px-40">
        <h1 className="text-4xl dark:text-white">Building Survey Report</h1>
          <input type="text" className="my-4 py-3 px-4 block w-full border border-gray-900 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:ring-gray-600" placeholder="This is placeholder" />
          <input type="text" className="py-3 px-4 block w-full border border-gray-900 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:ring-gray-600" placeholder="This is placeholder" />
      </div>
    </>
  )
}
