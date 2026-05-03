import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { QrCode, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const MyQRCard = ({ user }) => {
    const vpa = user?.vpa || 'generating...';
    
    // Standard UPI URI format
    const upiUri = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(user?.name || 'User')}&mc=0000&mode=02&purpose=00`;

    const copyVPA = () => {
        navigator.clipboard.writeText(vpa);
        toast.success("UPI ID Copied!", {
            icon: '📋',
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            },
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] relative overflow-hidden group"
        >
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full group-hover:bg-blue-600/20 transition-all duration-500"></div>
            
            <div className="flex flex-col items-center gap-4 relative z-10">
                <div className="flex items-center gap-2 self-start mb-2">
                    <div className="bg-blue-600/20 p-2 rounded-xl">
                        <QrCode size={18} className="text-blue-400" />
                    </div>
                    <h3 className="font-bold text-slate-200">My Payment QR</h3>
                </div>

                {/* QR Code Container */}
                <div className="bg-white p-4 rounded-3xl shadow-2xl shadow-blue-600/10 transition-transform hover:scale-105 duration-300">
                    <QRCodeSVG 
                        value={upiUri} 
                        size={160}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                            src: "/logo.png", // We can add a small logo here later
                            x: undefined,
                            y: undefined,
                            height: 24,
                            width: 24,
                            excavate: true,
                        }}
                    />
                </div>

                {/* UPI ID Display */}
                <div className="w-full mt-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-1">Your UPI ID</p>
                    <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-2xl group/vpa">
                        <span className="text-sm font-mono font-bold text-blue-400 truncate mr-2">
                            {vpa}
                        </span>
                        <button 
                            onClick={copyVPA}
                            className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-all"
                        >
                            <Copy size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <CheckCircle size={12} className="text-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Verified Real-time Merchant</span>
                </div>
            </div>
        </motion.div>
    );
};

export default MyQRCard;
