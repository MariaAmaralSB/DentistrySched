import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";
import Layout from "./layout/Layout";
import Dashboard from "./pages/Dashboard";
import AdminDentistas from "./pages/AdminDentistas";
import Booking from "./pages/Booking";
import Success from "./pages/Success";
import AdminAgenda from "./pages/AdminAgenda";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/admin" replace /> },

  {
    path: "/admin",
    element: <Layout />,
    children: [
      { path: "/admin", element: <Dashboard /> },
      { path: "/admin/dentistas", element: <AdminDentistas /> },
      { path: "/admin/agenda", element: <AdminAgenda /> }, 
    ],
  },

  { path: "/site", element: <Booking /> },
  { path: "/sucesso/:id", element: <Success /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
