import { Routes, Route, Navigate } from 'react-router-dom';

import { Login } from './pages/Login';
import { TermsOfUse } from './pages/TermsOfUse';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { PatientDetail } from './pages/PatientDetail';
import { Appointments } from './pages/Appointments';
import { Procedures } from './pages/Procedures';
import { Finance } from './pages/Finance';
import { Inventory } from './pages/Inventory';
import { InventoryDetail } from './pages/InventoryDetail';
import { Professionals } from './pages/Professionals';
import { Roles } from './pages/Roles';
import { Messages } from './pages/Messages';
import { Availability } from './pages/Availability';
import { EquipmentPage } from './pages/Equipment';
import { Documents } from './pages/Documents';
import { RecurringExpensesPage } from './pages/RecurringExpenses';
import { Packages } from './pages/Packages';
import { Metrics } from './pages/Metrics';
import { Promotions } from './pages/Promotions';
import { PaymentMethods } from './pages/PaymentMethods';
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import { PermissionRoute } from './components/PermissionRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/termos" element={<TermsOfUse />} />
      <Route path="/privacidade" element={<PrivacyPolicy />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/pacientes"
          element={
            <PermissionRoute permission="patients:view">
              <Patients />
            </PermissionRoute>
          }
        />
        <Route
          path="/pacientes/:id"
          element={
            <PermissionRoute permission="patients:view">
              <PatientDetail />
            </PermissionRoute>
          }
        />
        <Route
          path="/agenda"
          element={
            <PermissionRoute permission="appointments:view">
              <Appointments />
            </PermissionRoute>
          }
        />
        <Route
          path="/procedimentos"
          element={
            <PermissionRoute permission="procedures:view">
              <Procedures />
            </PermissionRoute>
          }
        />
        <Route
          path="/pacotes"
          element={
            <PermissionRoute permission="packages:view">
              <Packages />
            </PermissionRoute>
          }
        />
        <Route
          path="/financeiro"
          element={
            <PermissionRoute permission="finance:view">
              <Finance />
            </PermissionRoute>
          }
        />
        <Route
          path="/despesas-recorrentes"
          element={
            <PermissionRoute permission="finance:view">
              <RecurringExpensesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/estoque"
          element={
            <PermissionRoute permission="inventory:view">
              <Inventory />
            </PermissionRoute>
          }
        />
        <Route
          path="/estoque/:id"
          element={
            <PermissionRoute permission="inventory:view">
              <InventoryDetail />
            </PermissionRoute>
          }
        />
        <Route
          path="/profissionais"
          element={
            <PermissionRoute permission="users:view">
              <Professionals />
            </PermissionRoute>
          }
        />
        <Route
          path="/grupos"
          element={
            <PermissionRoute permission="roles:view">
              <Roles />
            </PermissionRoute>
          }
        />
        <Route
          path="/mensagens"
          element={
            <PermissionRoute permission="messages:view">
              <Messages />
            </PermissionRoute>
          }
        />
        <Route path="/horarios" element={<Availability />} />
        <Route
          path="/equipamentos"
          element={
            <PermissionRoute permission="equipment:view">
              <EquipmentPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/documentos"
          element={
            <PermissionRoute permission="documents:view">
              <Documents />
            </PermissionRoute>
          }
        />
        <Route
          path="/metricas"
          element={
            <PermissionRoute permission="metrics:view">
              <Metrics />
            </PermissionRoute>
          }
        />
        <Route
          path="/promocoes"
          element={
            <PermissionRoute permission="promotions:view">
              <Promotions />
            </PermissionRoute>
          }
        />
        <Route
          path="/formas-pagamento"
          element={
            <PermissionRoute permission="payment-methods:view">
              <PaymentMethods />
            </PermissionRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
