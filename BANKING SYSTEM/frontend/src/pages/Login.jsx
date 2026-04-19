import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

function Login() {
  // 1. STATE: React "remembers" what you type here
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 2. TOOLS: useAuth for global state, useNavigate to change pages
  const { login } = useAuth();
  const navigate = useNavigate();

  // 3. THE HANDLER: What happens when you click "Sign In"
  const handleSubmit = async (e) => {
    e.preventDefault(); // Stop the page from refreshing!
    setLoading(true);

    try {
      // 4. THE CALL: Send data to your API Gateway
      const response = await API.post('/auth/login', { email, password });
      
      // 5. THE SUCCESS: If backend says OK, we update our Global Context
      login(response.data.user, response.data.token);
      
      toast.success('Welcome back to Antigravity Bank!');
      navigate('/dashboard'); // Move to the dashboard automatically
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* motion.div: Adds a smooth fade-in effect when the page opens */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl"
      >
        <h2 className="text-3xl font-bold text-white mb-2">Sign In</h2>
        <p className="text-slate-400 mb-8">Access your secure banking dashboard.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)} // The "Typing" logic
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)} // The "Typing" logic
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Secure Login'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default Login;
