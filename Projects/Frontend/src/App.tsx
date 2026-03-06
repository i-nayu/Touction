import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./Pages/Register/Register.tsx";
import Tournament from "./Pages/Tournament/Tournament.tsx";
import Auction from "./Pages/Auction/Auction.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Register />} />
        <Route path='/tournament' element={<Tournament />} />
        <Route path='/auction' element={<Auction />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;