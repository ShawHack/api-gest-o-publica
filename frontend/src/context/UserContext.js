import { createContext } from "react";
import useAuth from '../hooks/usuAuth'; // Corrigido para 'useAuth'

const Context = createContext();

function Userprovider({ children }) {
   // Pega os novos valores, incluindo 'user' e 'loading'
   const { authenticated, user, loading, register, logout, login } = useAuth();

   // user nunca null - evita "Cannot read properties of null (reading 'isAdmin')" em Navbar e outros
   const safeUser = user ?? { role: 'usuario', isAdmin: false };
   const contextValue = { authenticated, user: safeUser, loading, register, logout, login };

   return (
     <Context.Provider value={contextValue}>
       {/* NOVO: Não renderiza a aplicação até que a verificação inicial termine */}
       {/* Isso evita que as páginas tentem carregar dados antes de sabermos se o usuário está logado */}
       {!loading && children}
     </Context.Provider>
   );
}

export { Context, Userprovider };
