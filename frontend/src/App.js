import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom'

/* pages */
import Login from './components/pages/Auth/Login'
import Register from './components/pages/Auth/Register'
import LoginMonitoramento from './components/pages/Auth/LoginMonitoramento'
import ForgotPassword from './components/pages/Auth/ForgotPassword'
import ResetPassword from './components/pages/Auth/ResetPassword'
import VerifyEmail from './components/pages/Auth/VerifyEmail'
import Profile from './components/pages/User/Profile'
import MeusSepultados from './components/pages/Sepultado/MeusSepultados'
import AddSepultado from './components/pages/Sepultado/addSepultado'
import EditSepultado from './components/pages/Sepultado/EditSepultado'
import SepultadoDetails from './components/pages/Sepultado/SepultadosDetails'
import SearchResults from './components/pages/Sepultado/SearchResults'
import MemorialSearchErrorBoundary from './components/memorial/MemorialSearchErrorBoundary'

/* usuários */
import MeusUsuarios from './components/pages/User/MeusUsuarios'
import AddUsuario from './components/pages/User/AddUsuario'
import EditUsuario from './components/pages/User/EditUsuario'

/* medicamentos */
import Medicamentos from './components/pages/Medicamentos/Medicamentos'

/* shift handover */
import ShiftHandoverList from './components/pages/ShiftHandover/ShiftHandoverList'
import ShiftHandoverForm from './components/pages/ShiftHandover/ShiftHandoverForm'
import ShiftHandoverDetail from './components/pages/ShiftHandover/ShiftHandoverDetail'
import CompliancePortal from './components/pages/Compliance/CompliancePortal'
import EducationPortal from './components/pages/Education/EducationPortal'
import EducationAdminPortal from './components/pages/Education/admin/EducationAdminPortal'
import RuralOperatorPage from './components/pages/RuralPortal/RuralOperatorPage'
import RuralOwnerPage from './components/pages/RuralPortal/RuralOwnerPage'
import RuralAdminPage from './components/pages/RuralPortal/RuralAdminPage'
import NotFoundPage from './components/pages/NotFound/NotFoundPage'
import RuralAccessDeniedPage from './components/pages/RuralPortal/RuralAccessDeniedPage'

/* layout */
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Container from './components/layout/Container'
import Message from './components/layout/Message'
import WhatsAppButton from './components/layout/WhatsAppButton'

/* guards */
import RequireAuth from './components/pages/Auth/RequireAuth'
import RoleGate from './components/pages/Auth/RoleGate'

/* context */
import {
    Userprovider
} from './context/UserContext'

// Quando servido em /sama/ (PUBLIC_URL=/sama), o Router precisa de basename para as rotas funcionarem
const basename = process.env.PUBLIC_URL === '/sama' ? '/sama' : '';

function App() {
    return (
        <Router basename={basename}>
            <Userprovider>
                <Message />
                <WhatsAppButton />

                <Routes>
                    {/* ==================== ROTAS PÚBLICAS SEM LAYOUT ==================== */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/monitoramento/login" element={<LoginMonitoramento />} />
                    <Route path="/monitoramento/login." element={<LoginMonitoramento />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                    <Route path="/auth/reset-password" element={<ResetPassword />} />
                    <Route path="/auth/verify-email" element={<VerifyEmail />} />

                    {/* ==================== FARMÁCIA MUNICIPAL (layout próprio) ==================== */}
                    <Route path="/medicamentos" element={<Medicamentos />} />

                    {/* ==================== COMPLIANCE (PORTAL INDEPENDENTE) ==================== */}
                    <Route path="/compliance" element={<CompliancePortal />} />

                    {/* ==================== EDUCAÇÃO (PORTAL INDEPENDENTE) ==================== */}
                    <Route path="/educacao/admin/*" element={<EducationAdminPortal />} />
                    <Route path="/educacao/*" element={<EducationPortal />} />
                    <Route path="/rotas-rurais/proprietario" element={<RuralOwnerPage />} />
                    <Route path="/rotas-rurais/operador" element={
                        <RequireAuth><RoleGate allow={['admin', 'rotas_admin', 'rotas_operador']} fallback={<RuralAccessDeniedPage />}><RuralOperatorPage /></RoleGate></RequireAuth>
                    } />
                    <Route path="/rotas-rurais/admin" element={
                        <RequireAuth><RoleGate allow={['admin', 'rotas_admin']} fallback={<RuralAccessDeniedPage />}><RuralAdminPage /></RoleGate></RequireAuth>
                    } />

                    {/* ==================== BUSCA DE SEPULTURAS (layout próprio) ==================== */}
                    <Route
                        path="/"
                        element={
                            <MemorialSearchErrorBoundary>
                                <SearchResults />
                            </MemorialSearchErrorBoundary>
                        }
                    />
                    <Route
                        path="/sepulturas"
                        element={
                            <MemorialSearchErrorBoundary>
                                <SearchResults />
                            </MemorialSearchErrorBoundary>
                        }
                    />
                    <Route
                        path="/sepultados/pesquisa"
                        element={
                            <MemorialSearchErrorBoundary>
                                <SearchResults />
                            </MemorialSearchErrorBoundary>
                        }
                    />

                    {/* ==================== ROTAS COM LAYOUT PADRÃO ==================== */}
                    <Route path="/*" element={
                        <>
                            <Navbar />
                            <Container>
                                <Routes>
                                    {/* Públicas */}
                                    <Route path="/sepultados/:id" element={<SepultadoDetails />} />

                                    {/* Autenticadas (qualquer papel) */}
                                    <Route path="/user/profile" element={
                                        <RequireAuth>
                                            <Profile />
                                        </RequireAuth>
                                    } />

                                    {/* Admin & Concessionário */}
                                    <Route path="/sepultados/meumemorial" element={
                                        <RequireAuth>
                                            <RoleGate allow={['admin', 'concessionario']}>
                                                <MeusSepultados />
                                            </RoleGate>
                                        </RequireAuth>
                                    } />
                                    <Route path="/meussepultados" element={
                                        <Navigate to="/sepultados/meumemorial" replace />
                                    } />
                                    <Route path="/sepultados/edit/:id" element={
                                        <RequireAuth>
                                            <RoleGate allow={['admin', 'concessionario']}>
                                                <EditSepultado />
                                            </RoleGate>
                                        </RequireAuth>
                                    } />
                                    <Route path="/sepultados/add" element={
                                        <RequireAuth>
                                            <RoleGate allow={['admin']}>
                                                <AddSepultado />
                                            </RoleGate>
                                        </RequireAuth>
                                    } />
                                    <Route path="/meuusuario" element={
                                        <RequireAuth>
                                            <RoleGate allow={['admin']}>
                                                <MeusUsuarios />
                                            </RoleGate>
                                        </RequireAuth>
                                    } />
                                    <Route path="/usuarios/add" element={
                                        <RequireAuth>
                                            <RoleGate allow={['admin']}>
                                                <AddUsuario />
                                            </RoleGate>
                                        </RequireAuth>
                                    } />
                                    <Route path="/usuarios/edit/:id" element={
                                        <RequireAuth>
                                            <RoleGate allow={['admin']}>
                                                <EditUsuario />
                                            </RoleGate>
                                        </RequireAuth>
                                    } />

                                    {/* Shift Handover Routes */}
                                    <Route path="/shift-handovers" element={
                                        <RequireAuth>
                                            <RoleGate allow={['monitor', 'admin']}>
                                                <ShiftHandoverList />
                                            </RoleGate>
                                        </RequireAuth>
                                    } />
                                    <Route path="/shift-handovers/create" element={
                                        <RequireAuth>
                                            <RoleGate allow={['monitor', 'admin']}>
                                                <ShiftHandoverForm />
                                            </RoleGate>
                                        </RequireAuth>
                                    } />
                                    <Route path="/shift-handovers/edit/:id" element={
                                        <RequireAuth>
                                            <RoleGate allow={['monitor', 'admin']}>
                                                <ShiftHandoverForm />
                                            </RoleGate>
                                        </RequireAuth>
                                    } />
                                    <Route path="/shift-handovers/:id" element={
                                        <RequireAuth>
                                            <RoleGate allow={['monitor', 'admin']}>
                                                <ShiftHandoverDetail />
                                            </RoleGate>
                                        </RequireAuth>
                                    } />

                                    <Route path="*" element={<NotFoundPage />} />

                                </Routes>
                            </Container>
                            <Footer />
                        </>
                    } />
                </Routes>
            </Userprovider>
        </Router>
    )
}

export default App
