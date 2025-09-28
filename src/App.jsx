import { BrowserRouter } from "react-router-dom";
import './App.css'
import IndexRedirect from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <BrowserRouter>
     <>
      <IndexRedirect />
      <Toaster />
    </>
    </BrowserRouter>
    
  )
}

export default App 