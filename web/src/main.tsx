import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Booking from "./pages/Booking";
import Success from "./pages/Success";

const router = createBrowserRouter([
  { path: "/", element: <Booking /> },
  { path: "/sucesso/:id", element: <Success /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>
);