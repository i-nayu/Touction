import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./Pages/Register/Register.tsx";
import Tournament from "./Pages/Tournament/Tournament.tsx";
import Auction from "./Pages/Auction/Auction.tsx";
import AuctionBuy from "./Pages/AuctionBuy/AuctionBuy.tsx";
import UploadPhoto from "./Pages/UploadPhoto/UploadPhoto.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Register />} />
        <Route path='/tournament' element={<Tournament />} />
        <Route path='/auction' element={<Auction />} />
        <Route path='/auction-buy' element={<AuctionBuy />} />
        <Route path='/upload-photo' element={<UploadPhoto />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;