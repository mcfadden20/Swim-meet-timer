import { useState } from 'react'
import Stopwatch from './components/Stopwatch'

function App() {
  return (
    <div className="w-full h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8 tracking-tight text-blue-400">
        Swim Meet Timer
      </h1>
      <Stopwatch />
    </div>
  )
}

export default App
