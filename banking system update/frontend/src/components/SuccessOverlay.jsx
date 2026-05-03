import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const SuccessOverlay = ({ isVisible, data, onClose }) => {
    // Auto-close after 5 seconds
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 5000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
                    />

                    {/* Content Card */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 40 }}
                        className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl text-center overflow-hidden"
                    >
                        {/* Glowing Background Effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/20 rounded-full blur-[80px] -mt-20"></div>

                        {/* Animated Checkmark */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ 
                                type: "spring", 
                                stiffness: 260, 
                                damping: 20,
                                delay: 0.2 
                            }}
                            className="relative z-10 w-24 h-24 bg-emerald-500 rounded-full mx-auto mb-8 flex items-center justify-center shadow-lg shadow-emerald-500/40"
                        >
                            <CheckCircle2 size={48} className="text-white" strokeWidth={3} />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <h2 className="text-2xl font-black text-white mb-2">Payment Received!</h2>
                            <p className="text-slate-400 text-sm mb-8 font-medium">Your account has been credited</p>
                        </motion.div>

                        {/* Amount Display */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                            className="bg-slate-950 border border-slate-800 rounded-3xl p-6 mb-8"
                        >
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Total Amount</p>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-xl font-light text-emerald-500">₹</span>
                                <span className="text-4xl font-black text-white">{data?.amount?.toLocaleString()}</span>
                            </div>
                        </motion.div>

                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            onClick={onClose}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group"
                        >
                            <span>Dismiss</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SuccessOverlay;
