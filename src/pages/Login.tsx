import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface LoginProps {
  onLogin: (username: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
      navigate("/"); // redirect back to dashboard
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center text-red-700">
          Crisis Response Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" className="w-full bg-red-600 text-white">
            Log In
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
