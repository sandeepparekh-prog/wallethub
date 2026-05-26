import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import Upload from "./pages/Upload";
import Settings from "./pages/Settings";
import VendorRules from "./pages/VendorRules";

export default function App() {
  const [currency, setCurrency] = useState("USD");

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <Layout currency={currency} onCurrencyChange={setCurrency} />
          }
        >
          <Route index element={<Dashboard currency={currency} />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/vendor-rules" element={<VendorRules />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
