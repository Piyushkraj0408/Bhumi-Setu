import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import { ToastProvider } from "./components/ui/Toast";
import { AuthProvider } from "./lib/AuthContext";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
