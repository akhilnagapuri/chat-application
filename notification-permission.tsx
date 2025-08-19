"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell } from "lucide-react"

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission)
      setShowPrompt(Notification.permission === "default")
    }
  }, [])

  const requestPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
      setShowPrompt(false)
    }
  }

  if (!showPrompt || !("Notification" in window)) {
    return null
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bell className="h-4 w-4" />
          Enable Notifications
        </CardTitle>
        <CardDescription className="text-xs">
          Get notified when you receive new messages while the app is in the background.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button size="sm" onClick={requestPermission} className="flex-1">
            Allow
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowPrompt(false)} className="flex-1">
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
