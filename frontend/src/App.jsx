import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import CvCheck from "./pages/CvCheck";
import GraphqlCheck from "./pages/GraphqlCheck";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cv-check"
        element={
          <ProtectedRoute>
            <CvCheck />
          </ProtectedRoute>
        }
      />
      <Route
        path="/graphql-check"
        element={
          <ProtectedRoute>
            <GraphqlCheck />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}