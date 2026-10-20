import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router";
import Login from "./pages/Auth/Login";
import Home from "./pages/Dashboard/Home";
import EALIssuance from "./pages/Dashboard/EALIssuance";
import EALUsage from "./pages/Dashboard/EALUsage";
import Users from "./pages/Dashboard/Users";
import UserProvider from "./context/userContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast";
import Dispatch from "./pages/Dashboard/Dispatch";
import Logout from "./pages/Auth/Logout";
import FinishedStock from "./pages/Dashboard/FinishedStock";
import FindEAL from "./pages/Dashboard/FindEAL";
import EALStock from "./pages/Dashboard/EALStock";
import Items from "./pages/Dashboard/Items";
import Packs from "./pages/Dashboard/Packs";
import DeliveryDepots from "./pages/Dashboard/DeliveryDepots";
import Companies from "./pages/Dashboard/Companies";

const App = () => {
  return (
    <UserProvider>
      <div>
        <Router>
          <Routes>
            <Route path="/" element={<Root />} />
            <Route path="/login" exact element={<Login />} />
            <Route path="/logout" exact element={<Logout />} />

            <Route path="/users" exact element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/dashboard" exact element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/eal-issuance" exact element={<ProtectedRoute><EALIssuance /></ProtectedRoute>} />
            <Route path="/eal-usage" exact element={<ProtectedRoute><EALUsage /></ProtectedRoute>} />
            <Route path="/finished-stock" exact element={<ProtectedRoute><FinishedStock /></ProtectedRoute>} />
            <Route path="/dispatch" exact element={<ProtectedRoute><Dispatch /></ProtectedRoute>} />
            <Route path="/eal-stock" exact element={<ProtectedRoute><EALStock /></ProtectedRoute>} />
            <Route path="/find-eal" exact element={<ProtectedRoute><FindEAL /></ProtectedRoute>} />
            <Route path="/items" exact element={<ProtectedRoute><Items /></ProtectedRoute>} />
            <Route path="/packs" exact element={<ProtectedRoute><Packs /></ProtectedRoute>} />
            <Route path="/delivery-depots" exact element={<ProtectedRoute><DeliveryDepots /></ProtectedRoute>} />
            <Route path="/companies" exact element={<ProtectedRoute><Companies /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </div>
      <Toaster
        toastOptions={{
          className: "",
          style: {
            fontSize: '13px'
          },
        }}
      />
    </UserProvider>
  );
};

export default App;

const Root = () => {
  // Check the token exists in localStorage
  const isAuthenticated = !!localStorage.getItem('token');

  // Redirects to dahsboard if authenticated, otherwise to login
  return isAuthenticated ? (
    <Navigate to="/dashboard" />
  ) : (
    <Navigate to="/login" />
  )
};