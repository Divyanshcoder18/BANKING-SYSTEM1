import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import API from '../api/axios';
import { toast } from 'react-hot-toast';

function TransferModal({ isOpen, onClose, fromAccountId, userEmail, onSuccess, initialRecipient }) {
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [rzpLoading, setRzpLoading] = useState(false);
  // VALIDATION STATE
  const [recipientName, setRecipientName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Auto-fill when scanned
  React.useEffect(() => {
    if (initialRecipient) {
      setToAccount(initialRecipient);
    }
  }, [initialRecipient]);

  // VPA LOOKUP LOGIC (Debounced)
  React.useEffect(() => {
    if (toAccount.includes('@')) {
      setIsValidating(true);
      setRecipientName('');
      setValidationError('');

      const delayDebounceFn = setTimeout(async () => {
        try {
          const res = await API.get(`/users/info/vpa/${toAccount}`);
          setRecipientName(res.data.name);
          setValidationError('');
        } catch (err) {
          setRecipientName('');
          setValidationError('Recipient not found');
        } finally {
          setIsValidating(false);
        }
      }, 600);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setRecipientName('');
      setValidationError('');
      setIsValidating(false);
    }
  }, [toAccount]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!toAccount || !amount) return toast.error("Please fill all fields");

    setLoading(true);
    try {
      if (toAccount.includes('@')) {
        // Send Real Money via RazorpayX Payouts
        await API.post('/transaction/payment/payout/p2p', {
          accountId: fromAccountId,
          amount: parseFloat(amount),
          recipientType: 'vpa',
          vpa: toAccount,
          name: recipientName || toAccount
        });
      } else {
        // Standard Digital Internal Transfer
        await API.post('/transaction/transfer', {
          fromaccount: fromAccountId,
          toaccount: toAccount,
          amount: parseFloat(amount),
          idempotencyKey: `tx-${Date.now()}-${Math.random()}`,
          email: userEmail
        });
      }
      
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-emerald-500/50`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-bold text-white">Transfer Initiated!</p>
                <p className="mt-1 text-sm text-slate-400">Your funds are being processed securely.</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-800">
            <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-500 hover:text-blue-400">Close</button>
          </div>
        </div>
      ));
      
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayTransfer = async () => {
    if (!toAccount || !amount) return toast.error("Please fill all fields");

    setRzpLoading(true);
    try {
      // 1. Create Order in our Backend
      const orderRes = await API.post('/transaction/payment/order', { 
        amount: parseFloat(amount) 
      });
      const { order } = orderRes.data;

      // 2. Configure Razorpay Options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: order.amount,
        currency: "INR",
        name: "APEX GLOBAL BANK",
        description: "Direct P2P Transfer",
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyRes = await API.post('/transaction/payment/verify/p2p', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              toAccount: toAccount,
              fromAccountId: fromAccountId, // Pass sender ID for history tracking
              amount: parseFloat(amount)
            });

            if (verifyRes.data.success) {
              toast.success("Payment Verified! Recipient Credited.");
              onSuccess();
              onClose();
            }
          } catch (err) {
            toast.error("Payment verification failed!");
          }
        },
        prefill: {
          name: "User",
          email: userEmail,
        },
        theme: {
          color: "#2563eb",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      toast.error(err.response?.data?.message || "Payment initiation failed");
    } finally {
      setRzpLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-400">
                <Send size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Transfer Money</h2>
                <p className="text-slate-500 text-sm">Send funds to another account</p>
              </div>
            </div>

            <form onSubmit={handleTransfer} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 ml-1">Recipient (Account ID or UPI ID)</label>
                <input 
                  type="text" 
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  placeholder="e.g. 64b1... or alex@apnabank"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
                
                {/* VALIDATION FEEDBACK UI */}
                <AnimatePresence>
                  {isValidating && (
                    <motion.p 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1 animate-pulse"
                    >
                      Checking VPA...
                    </motion.p>
                  )}

                  {recipientName && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/5"
                    >
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400">Paying: {recipientName}</span>
                    </motion.div>
                  )}

                  {validationError && !isValidating && (
                    <motion.p 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      className="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-2 ml-1"
                    >
                      {validationError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 ml-1">Amount (₹)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl flex gap-3">
                <AlertCircle className="text-blue-400 flex-shrink-0" size={20} />
                <p className="text-xs text-blue-300 leading-relaxed">
                  Funds will be debited instantly. The recipient will see the credit reflecting in their history within a few moments.
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  type="submit"
                  disabled={loading || rzpLoading}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-white font-bold py-4 rounded-2xl transition-all border border-slate-700 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Pay from Wallet</span>
                  )}
                </button>
                <button 
                  type="button"
                  onClick={handleRazorpayTransfer}
                  disabled={loading || rzpLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {rzpLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Pay via Real Bank</span>
                      <Send size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default TransferModal;
