import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./Pages/Register/Register.tsx";
import Tournament from "./Pages/Tournament/Tournament.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Register />} />
        <Route path='/tournament' element={<Tournament />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;