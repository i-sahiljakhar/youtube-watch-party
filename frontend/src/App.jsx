
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext";

import Room from "./pages/Room";
import "./index.css";
import Home from "./pages/Home";

export default function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomCode" element={<Room />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
