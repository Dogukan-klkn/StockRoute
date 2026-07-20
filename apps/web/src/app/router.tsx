import { createBrowserRouter, Navigate } from 'react-router-dom';
import { UserRole } from '@stockroute/shared-types';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleGuard } from '../components/RoleGuard';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { BranchesPage } from '../features/branches/BranchesPage';
import { ProductsPage } from '../features/products/ProductsPage';
import { InventoryPage } from '../features/inventory/InventoryPage';
import { MovementsPage } from '../features/movements/MovementsPage';
import { UsersPage } from '../features/users/UsersPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'branches',
        element: (
          <RoleGuard allowed={[UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER]}>
            <BranchesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'products',
        element: (
          <RoleGuard
            allowed={[UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER, UserRole.WAREHOUSE_STAFF]}
          >
            <ProductsPage />
          </RoleGuard>
        ),
      },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'movements', element: <MovementsPage /> },
      {
        path: 'users',
        element: (
          <RoleGuard allowed={[UserRole.FIRM_ADMIN]}>
            <UsersPage />
          </RoleGuard>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
