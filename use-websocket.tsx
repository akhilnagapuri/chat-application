"use client"

import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from "react"
import { useAuth } from "./use-auth"
import { useToast } from "./use-toast"

export interface ChatMessage {
  id: string
  userId: string
  username: string
  content: string
  timestamp: Date
  avatar?: string
  status?: "sending" | "sent" | "delivered" | "failed"
}

export interface OnlineUser {
  id: string
  username: string
  avatar?: string
  lastSeen?: Date
}

interface WebSocketContextType {
  messages: ChatMessage[]
  onlineUsers: OnlineUser[]
  sendMessage: (content: string) => void
  isConnected: boolean
  typingUsers: string[]
  setTyping: (isTyping: boolean) => void
  connectionStatus: "connecting" | "connected" | "disconnected" | "reconnecting"
  unreadCount: number
  markAsRead: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "reconnecting"
  >("disconnected")
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const isWindowFocused = useRef(true)

  const playNotificationSound = useCallback(() => {
    if ("AudioContext" in window || "webkitAudioContext" in window) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    }
  }, [])

  useEffect(() => {
    const handleFocus = () => {
      isWindowFocused.current = true
      setUnreadCount(0)
    }
    const handleBlur = () => {
      isWindowFocused.current = false
    }

    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)

    return () => {
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
    }
  }, [])

  const connectWebSocket = useCallback(() => {
    if (!user) return

    setConnectionStatus("connecting")
    console.log("[v0] Attempting WebSocket connection...")

    // For demo purposes, simulate WebSocket connection
    setTimeout(() => {
      setIsConnected(true)
      setConnectionStatus("connected")
      reconnectAttempts.current = 0

      console.log("[v0] WebSocket connected successfully")
      toast({
        title: "Connected",
        description: "You're now connected to the chat",
      })

      // Load initial messages from localStorage
      const savedMessages = localStorage.getItem("chatapp-messages")
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          status: "delivered",
        }))
        setMessages(parsedMessages)
      }

      // Simulate other online users with realistic presence
      setOnlineUsers([
        {
          id: "1",
          username: "Alice",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
          lastSeen: new Date(),
        },
        {
          id: "2",
          username: "Bob",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
          lastSeen: new Date(Date.now() - 300000), // 5 minutes ago
        },
        {
          id: "3",
          username: "Charlie",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
          lastSeen: new Date(),
        },
      ])
    }, 1000)
  }, [user, toast])

  const handleDisconnection = useCallback(() => {
    setIsConnected(false)
    setConnectionStatus("disconnected")

    if (reconnectAttempts.current < maxReconnectAttempts) {
      setConnectionStatus("reconnecting")
      reconnectAttempts.current += 1

      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
      console.log(`[v0] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`)

      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket()
      }, delay)

      toast({
        title: "Connection lost",
        description: `Reconnecting... (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Connection failed",
        description: "Unable to connect to chat server. Please refresh the page.",
        variant: "destructive",
      })
    }
  }, [connectWebSocket, toast])

  useEffect(() => {
    if (!user) return

    connectWebSocket()

    return () => {
      setIsConnected(false)
      setConnectionStatus("disconnected")
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [user, connectWebSocket])

  const sendMessage = useCallback(
    (content: string) => {
      if (!user || !content.trim() || !isConnected) return

      const tempId = `temp-${Date.now()}`
      const newMessage: ChatMessage = {
        id: tempId,
        userId: user.id,
        username: user.username,
        content: content.trim(),
        timestamp: new Date(),
        avatar: user.avatar,
        status: "sending",
      }

      console.log("[v0] Sending message:", newMessage.content)

      // Add message with sending status
      setMessages((prev) => [...prev, newMessage])

      // Simulate message delivery
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? {
                  ...msg,
                  id: Date.now().toString(),
                  status: "sent",
                }
              : msg,
          ),
        )

        // Simulate delivery confirmation
        setTimeout(() => {
          setMessages((prev) => {
            const updated = prev.map((msg) => (msg.id === tempId ? { ...msg, status: "delivered" } : msg))
            localStorage.setItem("chatapp-messages", JSON.stringify(updated))
            return updated
          })
        }, 500)
      }, 200)

      // Simulate receiving messages from other users occasionally
      if (Math.random() > 0.7) {
        setTimeout(
          () => {
            const responses = [
              "That's interesting!",
              "I agree with that",
              "Thanks for sharing",
              "Good point!",
              "How's everyone doing?",
              "Anyone else online?",
            ]
            const randomUser = onlineUsers[Math.floor(Math.random() * onlineUsers.length)]
            if (randomUser) {
              const responseMessage: ChatMessage = {
                id: Date.now().toString(),
                userId: randomUser.id,
                username: randomUser.username,
                content: responses[Math.floor(Math.random() * responses.length)],
                timestamp: new Date(),
                avatar: randomUser.avatar,
                status: "delivered",
              }

              setMessages((prev) => {
                const updated = [...prev, responseMessage]
                localStorage.setItem("chatapp-messages", JSON.stringify(updated))
                return updated
              })

              // Show notification if window is not focused
              if (!isWindowFocused.current) {
                setUnreadCount((prev) => prev + 1)
                playNotificationSound()

                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification(`New message from ${randomUser.username}`, {
                    body: responseMessage.content,
                    icon: randomUser.avatar,
                  })
                }
              }
            }
          },
          2000 + Math.random() * 3000,
        )
      }
    },
    [user, isConnected, onlineUsers, playNotificationSound],
  )

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!user) return

      console.log("[v0] User typing status:", isTyping)

      if (isTyping) {
        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }

        // Simulate other users seeing typing indicator
        if (Math.random() > 0.8) {
          const randomUser = onlineUsers[Math.floor(Math.random() * onlineUsers.length)]
          if (randomUser) {
            setTypingUsers((prev) => [...prev.filter((u) => u !== randomUser.username), randomUser.username])

            setTimeout(
              () => {
                setTypingUsers((prev) => prev.filter((u) => u !== randomUser.username))
              },
              2000 + Math.random() * 2000,
            )
          }
        }

        // Set timeout to stop typing after 3 seconds
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false)
        }, 3000)
      }
    },
    [user, onlineUsers],
  )

  const markAsRead = useCallback(() => {
    setUnreadCount(0)
  }, [])

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

  return (
    <WebSocketContext.Provider
      value={{
        messages,
        onlineUsers,
        sendMessage,
        isConnected,
        typingUsers,
        setTyping,
        connectionStatus,
        unreadCount,
        markAsRead,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}
