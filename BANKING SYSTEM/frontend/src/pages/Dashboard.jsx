import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { motion } from 'framer-motion';
import { Wallet, ArrowUpRight, ArrowDownLeft, History, LogOut, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

function Dashboard() {
  const { user, logout } = useAuth();
  
  // 1. STATE: We need spaces in memory to hold our bank data
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. DATA FETCHING: The code that runs when the "water tap" is opened
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // We call two services at once (User Service and Transaction Service)
        const [accountsRes, historyRes] = await Promise.all([
          API.get('/users/useraccount'),
          // If we don't have an account yet, we just send a placeholder ID
          API.get(`/transaction/history/${user?.accountId || 'none'}`)
        ]);

        setAccounts(accountsRes.data);
        setTransactions(historyRes.data);
      } catch (err) {
        toast.error("Could not load bank data. Is the backend running?");
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // 3. UI LOADING STATE
  if (loading) {
    return (
      <div className="h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium">Securing your connection...</p>
      </div>
    );
  }

  // Calculate total balance across all accounts (if multiple)
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER SECTION */}
        <header className="flex justify-between items-center mb-10">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <h1 className="text-2xl md:text-3xl font-bold">Good morning, {user?.name.split(' ')[0]}!</h1>
            <p className="text-slate-400 text-sm">You have {accounts.length} active account(s).</p>
          </motion.div>
          
          <button 
            onClick={logout} 
            className="group flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 pr-4 rounded-full hover:bg-red-500/10 hover:border-red-500/50 transition-all text-slate-400 hover:text-red-500"
          >
            <div className="bg-slate-800 p-1.5 rounded-full group-hover:bg-red-500 group-hover:text-white transition-all">
              <LogOut size={16} />
            </div>
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* MAIN BALANCE CARD */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-emerald-500 p-8 rounded-[2rem] shadow-2xl transition-all hover:shadow-blue-500/20"
          >
            {/* Minimalist Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                  <Wallet size={28} className="text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold tracking-widest text-white/60 uppercase">Antigravity Platinum</p>
                  <p className="text-xs text-white/40 tracking-tighter">Debit Card •• 4292</p>
                </div>
              </div>
              
              <div className="mt-12">
                <p className="text-white/70 text-sm font-medium">Total Available Balance</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-light text-white/50">$</span>
                  <h2 className="text-5xl md:text-6xl font-bold tracking-tight">
                    {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h2>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-xs text-white/80 font-medium">System Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span className="text-xs text-white/80 font-medium">Microservices Online</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* QUICK ACTIONS PANEL */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <button className="flex flex-col justify-between p-6 bg-slate-900 border border-slate-800 rounded-[2rem] hover:bg-slate-800 hover:border-blue-500/30 transition-all group">
              <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all w-fit">
                <ArrowUpRight size={24} />
              </div>
              <span className="font-bold text-lg mt-4 block">Send<br/>Money</span>
            </button>
            
            <button className="flex flex-col justify-between p-6 bg-slate-900 border border-slate-800 rounded-[2rem] hover:bg-slate-800 hover:border-emerald-500/30 transition-all group">
              <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all w-fit">
                <Plus size={24} />
              </div>
              <span className="font-bold text-lg mt-4 block">Deposit<br/>Funds</span>
            </button>
          </div>
        </div>

        {/* RECENT ACTIVITY SECTION */}
        <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-[2rem]">
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-3">
                <div className="bg-slate-800 p-2 rounded-lg text-slate-400">
                  <History size={18} />
                </div>
                <h3 className="font-bold text-lg">Transaction History</h3>
             </div>
             <button className="text-blue-400 text-sm font-semibold hover:underline">View All</button>
          </div>

          <div className="space-y-4">
            {transactions.length > 0 ? (
              transactions.map((tx, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={tx._id} 
                  className="group flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800/50 rounded-2xl hover:bg-slate-800/50 hover:border-slate-700 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${tx.fromaccount === user.accountId ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {tx.fromaccount === user.accountId ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">
                        {tx.fromaccount === user.accountId ? 'Transfer Sent' : 'Payment Received'}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black ${tx.fromaccount === user.accountId ? 'text-white' : 'text-emerald-400'}`}>
                      {tx.fromaccount === user.accountId ? '-' : '+'}${tx.amount.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${tx.status === 'SUCCESS' ? 'bg-emerald-400' : 'bg-orange-400 animate-pulse'}`}></div>
                      <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">{tx.status}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                <p className="text-slate-500 font-medium italic">No transactions found for this account.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
