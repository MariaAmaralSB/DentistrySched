import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Booking from "./pages/Booking";
import Success from "./pages/Success";
import "./index.css";

const router = createBrowserRouter([
  { path: "/", element: <Booking /> },
  { path: "/sucesso/:id", element: <Success /> },
  { path: "*", element: <Navigate to="/" replace /> },
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
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
