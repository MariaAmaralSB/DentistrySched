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
import AdminAgenda from "./pages/AdminAgenda";
import { ThemeProvider } from "./theme";
import TenantGate from "./components/TenantGate";

import { AuthProvider } from "./auth/useAuth";
import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login"; 

const router = createBrowserRouter([
  { path: "/admin/login", element: <Login /> },

  { path: "/", element: <Navigate to="/admin" replace /> },

  {
    path: "/admin",
    element: <RequireAuth roles={["Admin", "Dentista", "Recepcao"]} />, 
    children: [
      {
        element: (
          <TenantGate>
            <Layout />
          </TenantGate>
        ),
        children: [
          { index: true, element: <Dashboard /> },
          { path: "dentistas", element: <AdminDentistas /> },
          { path: "agenda", element: <AdminAgenda /> },
        ],
      },
    ],
  },

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
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
