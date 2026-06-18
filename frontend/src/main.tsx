import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Providers } from "@/app/providers";
import { AppLayout } from "@/app/layout";
import "@/app/globals.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />
  }
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </React.StrictMode>
);
