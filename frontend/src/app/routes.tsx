import { createBrowserRouter } from "react-router-dom";
import { Providers } from "@/app/providers";
import { MainLayout } from "@/components/layout/MainLayout";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/register",
    element: <RegisterPage />
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "dashboard",
        element: <DashboardPage />
      },
      // Placeholders for next phases
      {
        path: "motels",
        element: <div>Motels Page Placeholder</div>
      },
      {
        path: "residents",
        element: <div>Residents Page Placeholder</div>
      },
      {
        path: "contracts",
        element: <div>Contracts Page Placeholder</div>
      },
      {
        path: "invoices",
        element: <div>Invoices Page Placeholder</div>
      },
      {
        path: "services",
        element: <div>Services Page Placeholder</div>
      },
      {
        path: "meter",
        element: <div>Meter Reading Page Placeholder</div>
      },
      {
        path: "reports",
        element: <div>Reports Page Placeholder</div>
      }
    ]
  }
]);
