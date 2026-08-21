import React, { createContext, useContext } from 'react';
const AuthContext = createContext({ user: null, loading: false });
export const AuthProvider = ({ children }: { children: React.ReactNode }) => <AuthContext.Provider value={{ user: null, loading: false }}>{children}</AuthContext.Provider>;
export const useAuth = () => useContext(AuthContext);
