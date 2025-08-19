"use client"

import { AuthProvider, useAuth } from "@/hooks/use-auth"
import { WebSocketProvider } from "@/hooks/use-websocket"
import { AuthForm } from "@/components/auth-form"
import { ChatLayout } from "@/components/chat-layout"
import { NotificationPermission } from "@/components/notification-permission"
import { Toaster } from "@/components/ui/toaster"

function AppContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg text-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  return (
    <WebSocketProvider>
      <ChatLayout />
      <NotificationPermission />
    </WebSocketProvider>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  )
}
