import { Route, Routes } from "react-router"
import Home from "./pages/Home"
import Projects from "./pages/Projects"

const App = () => {
  return (
    <div className='p-5'>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/project/:id" element={<Projects/>} />
      </Routes>
    </div>
  )
}

export default App
