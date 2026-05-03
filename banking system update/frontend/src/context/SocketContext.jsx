import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (user && user.id) {
            // Use the API Gateway URL
            const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:10000';
            const newSocket = io(gatewayUrl, {
                transports: ['websocket'],
                upgrade: false
            });

            newSocket.on('connect', () => {
                console.log('✅ Real-time Connected to Gateway');
                newSocket.emit('join', user.id);
            });

            newSocket.on('payment_status', (data) => {
                console.log('💸 Payment Update Received:', data);
                if (data.status === 'SUCCESS') {
                    toast.success(`Payment of ₹${data.amount} Successful!`, {
                        duration: 5000,
                        icon: '💰',
                        style: {
                            borderRadius: '10px',
                            background: '#333',
                            color: '#fff',
                        },
                    });
                    // Here we can trigger sounds or animations later
                } else {
                    toast.error(`Payment Failed: ${data.reason}`);
                }
            });

            setSocket(newSocket);

            return () => newSocket.close();
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
            }
        }
    }, [user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
