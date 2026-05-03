import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Zap, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
    const [scanner, setScanner] = useState(null);

    useEffect(() => {
        if (isOpen) {
            const html5QrCode = new Html5Qrcode("reader");
            setScanner(html5QrCode);

            const qrCodeSuccessCallback = (decodedText) => {
                console.log("QR Decoded:", decodedText);
                
                // Parse UPI URI: upi://pay?pa=name@bank&pn=Name...
                let vpa = "";
                try {
                    if (decodedText.startsWith('upi://pay')) {
                        const url = new URL(decodedText.replace('upi://pay', 'http://dummy.com'));
                        vpa = url.searchParams.get('pa');
                    } else {
                        // If it's just plain text, assume it's a VPA or Account ID
                        vpa = decodedText;
                    }

                    if (vpa) {
                        html5QrCode.stop().then(() => {
                            onScanSuccess(vpa);
                            onClose();
                        });
                    }
                } catch (e) {
                    toast.error("Invalid QR Code format");
                }
            };

            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
                .catch(err => {
                    console.error("Camera access error:", err);
                    toast.error("Could not access camera");
                });

            return () => {
                if (html5QrCode.isScanning) {
                    html5QrCode.stop();
                }
            };
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-600/20 p-2 rounded-xl text-blue-400">
                                    <Camera size={20} />
                                </div>
                                <h3 className="font-bold text-white">Scan QR Code</h3>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scanner Viewport */}
                        <div className="relative aspect-square bg-black">
                            <div id="reader" className="w-full h-full"></div>
                            
                            {/* Scanning Animation Overlay */}
                            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                                <div className="w-full h-full border-2 border-blue-500/30 rounded-3xl relative">
                                    <motion.div 
                                        animate={{ top: ['0%', '100%', '0%'] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                                    />
                                    
                                    {/* Corner Accents */}
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Info */}
                        <div className="p-8 text-center bg-slate-900/50">
                            <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
                                <Zap size={14} className="text-yellow-500" />
                                <p className="text-xs font-bold uppercase tracking-widest">Instant Recognition</p>
                            </div>
                            <p className="text-sm text-slate-500">
                                Point your camera at any UPI or APEX QR code to initiate an instant transfer.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ScannerModal;
