// src/main.tsx (ou src/index.tsx)
import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";

import Layout from "./layout/Layout";
import Dashboard from "./pages/Dashboard";
import AdminDentistas from "./pages/AdminDentistas";
import Booking from "./pages/Booking";
import Success from "./pages/Success";
import AdminAgenda from "./pages/AdminAgenda";
import { ThemeProvider } from "./theme";
import TenantGate from "./components/TenantGate";

const router = createBrowserRouter([
  // redireciona raiz para /admin
  { path: "/", element: <Navigate to="/admin" replace /> },

  // bloco admin protegido por TenantGate
  {
    path: "/admin",
    element: (
      <TenantGate>
        <Layout />
      </TenantGate>
    ),
    children: [
      { index: true, element: <Dashboard /> },            // /admin
      { path: "dentistas", element: <AdminDentistas /> }, // /admin/dentistas
      { path: "agenda", element: <AdminAgenda /> },       // /admin/agenda
    ],
  },

  // público
  { path: "/site", element: <Booking /> },
  { path: "/sucesso/:id", element: <Success /> },

  // fallback 404 simples (opcional)
  { path: "*", element: <Navigate to="/admin" replace /> },
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 60_000,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      keepPreviousData: true,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
