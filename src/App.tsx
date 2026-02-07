import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { GroupsPage } from "@/pages/GroupsPage";
import { GroupDetailPage } from "@/pages/GroupDetailPage";
import { CreateGroupPage } from "@/pages/CreateGroupPage";
import { GroupSettingsPage } from "@/pages/GroupSettingsPage";
import { AddMembersPage } from "@/pages/AddMembersPage";
import { AddContactPage } from "@/pages/AddContactPage";
import { CreateAddMembersPage } from "@/pages/CreateAddMembersPage";
import { CreateAddContactPage } from "@/pages/CreateAddContactPage";
import { FriendsPage } from "@/pages/FriendsPage";
import { ActivityPage } from "@/pages/ActivityPage";
import { AccountPage } from "@/pages/AccountPage";
import { AuthGuard } from "@/components/layout/AuthGuard";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export default function App() {
  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />

            {/* Protected routes with bottom nav */}
            <Route
              path="/groups"
              element={
                <AuthGuard>
                  <GroupsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/friends"
              element={
                <AuthGuard>
                  <FriendsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/activity"
              element={
                <AuthGuard>
                  <ActivityPage />
                </AuthGuard>
              }
            />
            <Route
              path="/account"
              element={
                <AuthGuard>
                  <AccountPage />
                </AuthGuard>
              }
            />

            {/* Protected routes without bottom nav */}
            <Route
              path="/groups/create"
              element={
                <AuthGuard>
                  <CreateGroupPage />
                </AuthGuard>
              }
            />
            <Route
              path="/groups/create/add-members"
              element={
                <AuthGuard>
                  <CreateAddMembersPage />
                </AuthGuard>
              }
            />
            <Route
              path="/groups/create/add-contact"
              element={
                <AuthGuard>
                  <CreateAddContactPage />
                </AuthGuard>
              }
            />
            <Route
              path="/groups/:id"
              element={
                <AuthGuard>
                  <GroupDetailPage />
                </AuthGuard>
              }
            />
            <Route
              path="/groups/:id/settings"
              element={
                <AuthGuard>
                  <GroupSettingsPage />
                </AuthGuard>
              }
            />
            <Route
              path="/groups/:id/add-members"
              element={
                <AuthGuard>
                  <AddMembersPage />
                </AuthGuard>
              }
            />
            <Route
              path="/groups/:id/add-contact"
              element={
                <AuthGuard>
                  <AddContactPage />
                </AuthGuard>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/groups" replace />} />
            <Route path="*" element={<Navigate to="/groups" replace />} />
          </Routes>
        </BrowserRouter>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
