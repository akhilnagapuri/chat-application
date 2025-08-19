import { WebSocketServer } from "ws"
import type { IncomingMessage } from "http"

export interface ChatMessage {
  id: string
  userId: string
  username: string
  content: string
  timestamp: Date
  avatar?: string
}

export interface ConnectedUser {
  id: string
  username: string
  avatar?: string
  ws: any
}

class ChatServer {
  private wss: WebSocketServer | null = null
  private connectedUsers: Map<string, ConnectedUser> = new Map()
  private messages: ChatMessage[] = []

  initialize(server: any) {
    this.wss = new WebSocketServer({ server })

    this.wss.on("connection", (ws: any, request: IncomingMessage) => {
      console.log("[v0] New WebSocket connection established")

      ws.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(ws, message)
        } catch (error) {
          console.error("[v0] Error parsing message:", error)
        }
      })

      ws.on("close", () => {
        this.handleDisconnection(ws)
      })

      ws.on("error", (error: Error) => {
        console.error("[v0] WebSocket error:", error)
      })
    })
  }

  private handleMessage(ws: any, message: any) {
    switch (message.type) {
      case "join":
        this.handleUserJoin(ws, message.user)
        break
      case "message":
        this.handleChatMessage(message)
        break
      case "typing":
        this.handleTyping(message)
        break
    }
  }

  private handleUserJoin(ws: any, user: { id: string; username: string; avatar?: string }) {
    console.log("[v0] User joining:", user.username)

    const connectedUser: ConnectedUser = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      ws,
    }

    this.connectedUsers.set(user.id, connectedUser)

    // Send existing messages to the new user
    ws.send(
      JSON.stringify({
        type: "message_history",
        messages: this.messages,
      }),
    )

    // Notify all users about the new connection
    this.broadcast({
      type: "user_joined",
      user: { id: user.id, username: user.username, avatar: user.avatar },
    })

    // Send current online users to the new user
    const onlineUsers = Array.from(this.connectedUsers.values()).map((u) => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar,
    }))

    ws.send(
      JSON.stringify({
        type: "online_users",
        users: onlineUsers,
      }),
    )
  }

  private handleChatMessage(messageData: { userId: string; username: string; content: string; avatar?: string }) {
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: messageData.userId,
      username: messageData.username,
      content: messageData.content,
      timestamp: new Date(),
      avatar: messageData.avatar,
    }

    this.messages.push(chatMessage)

    // Keep only last 100 messages in memory
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100)
    }

    console.log("[v0] Broadcasting message from:", messageData.username)

    this.broadcast({
      type: "new_message",
      message: chatMessage,
    })
  }

  private handleTyping(typingData: { userId: string; username: string; isTyping: boolean }) {
    this.broadcast(
      {
        type: "user_typing",
        userId: typingData.userId,
        username: typingData.username,
        isTyping: typingData.isTyping,
      },
      typingData.userId,
    )
  }

  private handleDisconnection(ws: any) {
    let disconnectedUser: ConnectedUser | null = null

    for (const [userId, user] of this.connectedUsers.entries()) {
      if (user.ws === ws) {
        disconnectedUser = user
        this.connectedUsers.delete(userId)
        break
      }
    }

    if (disconnectedUser) {
      console.log("[v0] User disconnected:", disconnectedUser.username)
      this.broadcast({
        type: "user_left",
        user: { id: disconnectedUser.id, username: disconnectedUser.username },
      })
    }
  }

  private broadcast(message: any, excludeUserId?: string) {
    const messageString = JSON.stringify(message)

    this.connectedUsers.forEach((user, userId) => {
      if (excludeUserId && userId === excludeUserId) return

      try {
        if (user.ws.readyState === 1) {
          // WebSocket.OPEN
          user.ws.send(messageString)
        }
      } catch (error) {
        console.error("[v0] Error sending message to user:", userId, error)
        this.connectedUsers.delete(userId)
      }
    })
  }

  getConnectedUsersCount(): number {
    return this.connectedUsers.size
  }

  getMessages(): ChatMessage[] {
    return this.messages
  }
}

export const chatServer = new ChatServer()
