import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { VehicleList } from "./pages/VehicleList";
import { VehicleDetail } from "./pages/VehicleDetail";
import { PartDetail } from "./pages/PartDetail";
import { PackPage } from "./pages/Pack";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/vehicles" replace />} />
        <Route path="/vehicles" element={<VehicleList />} />
        <Route path="/vehicles/:id" element={<VehicleDetail />} />
        <Route path="/vehicles/:id/pack" element={<PackPage />} />
        <Route path="/parts/:id" element={<PartDetail />} />
      </Route>
    </Routes>
  );
}
