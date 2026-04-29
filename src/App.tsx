import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StaffListPage } from '@/pages/staff/StaffListPage'
import { StaffDetailPage } from '@/pages/staff/StaffDetailPage'
import { ScanPage } from '@/pages/uniforms/ScanPage'
import { ItemDetailPage } from '@/pages/uniforms/ItemDetailPage'
import { UniformsPage } from '@/pages/uniforms/UniformsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { CompanySettingsPage } from '@/pages/settings/CompanySettingsPage'
import { BranchesPage } from '@/pages/settings/BranchesPage'
import { UsersPage } from '@/pages/settings/UsersPage'
import { StaffCategoriesPage } from '@/pages/settings/StaffCategoriesPage'
import { AssetStatesPage } from '@/pages/settings/AssetStatesPage'
import { ItemSubtypesPage } from '@/pages/settings/ItemSubtypesPage'
import { useAuth } from '@/hooks/useAuth'
import { BranchProvider } from '@/contexts/BranchContext'
import { OwnerGuard } from '@/components/OwnerGuard'

function AuthenticatedApp() {
  const { profile } = useAuth()
  return (
    <BranchProvider profile={profile}>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/staff" element={<StaffListPage />} />
          <Route path="/staff/:id" element={<StaffDetailPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/uniforms" element={<UniformsPage />} />
          <Route element={<OwnerGuard />}>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/company" element={<CompanySettingsPage />} />
            <Route path="/settings/branches" element={<BranchesPage />} />
            <Route path="/settings/users" element={<UsersPage />} />
            <Route path="/settings/staff-categories" element={<StaffCategoriesPage />} />
            <Route path="/settings/asset-states" element={<AssetStatesPage />} />
            <Route path="/settings/item-subtypes" element={<ItemSubtypesPage />} />
          </Route>
        </Routes>
      </Layout>
    </BranchProvider>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <AuthenticatedApp />
          </AuthGuard>
        }
      />
    </Routes>
  )
}
