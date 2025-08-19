"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useWebSocket } from "@/hooks/use-websocket"
import { MessageSquare, Send, Users, LogOut, Wifi, WifiOff, RotateCcw, Check, CheckCheck } from "lucide-react"

export function ChatLayout() {
  const { user, logout } = useAuth()
  const {
    messages,
    onlineUsers,
    sendMessage,
    isConnected,
    setTyping,
    connectionStatus,
    typingUsers,
    unreadCount,
    markAsRead,
  } = useWebSocket()
  const [messageInput, setMessageInput] = useState("")
  const [isTyping, setIsTypingState] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const handleFocus = () => {
      markAsRead()
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [markAsRead])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (messageInput.trim()) {
      sendMessage(messageInput)
      setMessageInput("")
      handleTypingStop()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)

    if (!isTyping) {
      setIsTypingState(true)
      setTyping(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop()
    }, 1000)
  }

  const handleTypingStop = () => {
    setIsTypingState(false)
    setTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case "sending":
        return <RotateCcw className="h-3 w-3 animate-spin opacity-50" />
      case "sent":
        return <Check className="h-3 w-3 opacity-50" />
      case "delivered":
        return <CheckCheck className="h-3 w-3 opacity-50" />
      case "failed":
        return <span className="text-destructive text-xs">Failed</span>
      default:
        return null
    }
  }

  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case "connecting":
        return { icon: <RotateCcw className="h-3 w-3 animate-spin" />, text: "Connecting...", color: "text-yellow-500" }
      case "connected":
        return { icon: <Wifi className="h-3 w-3" />, text: "Connected", color: "text-green-500" }
      case "reconnecting":
        return {
          icon: <RotateCcw className="h-3 w-3 animate-spin" />,
          text: "Reconnecting...",
          color: "text-yellow-500",
        }
      case "disconnected":
        return { icon: <WifiOff className="h-3 w-3" />, text: "Disconnected", color: "text-red-500" }
      default:
        return { icon: <WifiOff className="h-3 w-3" />, text: "Unknown", color: "text-gray-500" }
    }
  }

  const connectionDisplay = getConnectionStatusDisplay()

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-sidebar-primary" />
              <h1 className="text-xl font-bold text-sidebar-foreground">ChatApp</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Current User */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.username} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                {user?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{user?.username}</p>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-sidebar-accent-foreground/70">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Online Users */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-sidebar-foreground" />
            <h2 className="text-sm font-semibold text-sidebar-foreground">Online Users ({onlineUsers.length + 1})</h2>
          </div>

          <ScrollArea className="h-full">
            <div className="space-y-2">
              {onlineUsers.map((onlineUser) => {
                const isRecentlyActive =
                  onlineUser.lastSeen && new Date().getTime() - onlineUser.lastSeen.getTime() < 300000 // 5 minutes
                return (
                  <div
                    key={onlineUser.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={onlineUser.avatar || "/placeholder.svg"} alt={onlineUser.username} />
                      <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                        {onlineUser.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">{onlineUser.username}</p>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${isRecentlyActive ? "bg-green-500" : "bg-gray-400"}`} />
                        <span className="text-xs text-sidebar-foreground/70">
                          {isRecentlyActive ? "Online" : "Away"}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Connection Status */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <span className={connectionDisplay.color}>{connectionDisplay.icon}</span>
            <span className={`text-xs ${connectionDisplay.color}`}>{connectionDisplay.text}</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-card-foreground">General Chat</h2>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {messages.length} messages
            </Badge>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={message.avatar || "/placeholder.svg"} alt={message.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {message.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">{message.username}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                      {message.userId === user?.id && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-lg max-w-md ${
                        message.userId === user?.id
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      {message.userId === user?.id && (
                        <div className="flex justify-end mt-1">{getMessageStatusIcon(message.status)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {typingUsers.length > 0 && (
              <div className="flex gap-3">
                <div className="h-8 w-8 mt-1" />
                <div className="flex-1">
                  <div className="bg-muted p-3 rounded-lg max-w-md">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {typingUsers.length === 1
                          ? `${typingUsers[0]} is typing...`
                          : `${typingUsers.slice(0, -1).join(", ")} and ${typingUsers[typingUsers.length - 1]} are typing...`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border bg-card">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={messageInput}
              onChange={handleInputChange}
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              className="flex-1"
              disabled={!isConnected}
            />
            <Button type="submit" disabled={!messageInput.trim() || !isConnected} className="px-4">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="flex justify-between items-center mt-2">
            {isTyping && <p className="text-xs text-muted-foreground">You are typing...</p>}
            <div className="text-xs text-muted-foreground">
              {connectionStatus === "connected" && "Press Enter to send"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
