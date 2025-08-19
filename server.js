const { createServer } = require("http")
const { parse } = require("url")
const next = require("next")
const { WebSocketServer } = require("ws")

const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Simple in-memory storage for demo
const connectedUsers = new Map()
const messages = []

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error("Error occurred handling", req.url, err)
      res.statusCode = 500
      res.end("internal server error")
    }
  })

  // WebSocket server
  const wss = new WebSocketServer({ server })

  wss.on("connection", (ws, request) => {
    console.log("New WebSocket connection")

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString())

        switch (message.type) {
          case "join":
            connectedUsers.set(ws, message.user)

            // Send message history
            ws.send(
              JSON.stringify({
                type: "message_history",
                messages: messages,
              }),
            )

            // Broadcast user joined
            broadcast(
              {
                type: "user_joined",
                user: message.user,
              },
              ws,
            )
            break

          case "message":
            const chatMessage = {
              id: Date.now().toString(),
              userId: message.userId,
              username: message.username,
              content: message.content,
              timestamp: new Date(),
              avatar: message.avatar,
            }

            messages.push(chatMessage)

            // Keep only last 100 messages
            if (messages.length > 100) {
              messages.splice(0, messages.length - 100)
            }

            broadcast({
              type: "new_message",
              message: chatMessage,
            })
            break

          case "typing":
            broadcast(
              {
                type: "user_typing",
                userId: message.userId,
                username: message.username,
                isTyping: message.isTyping,
              },
              ws,
            )
            break
        }
      } catch (error) {
        console.error("Error parsing message:", error)
      }
    })

    ws.on("close", () => {
      const user = connectedUsers.get(ws)
      if (user) {
        connectedUsers.delete(ws)
        broadcast(
          {
            type: "user_left",
            user: user,
          },
          ws,
        )
      }
    })
  })

  function broadcast(message, excludeWs = null) {
    const messageString = JSON.stringify(message)

    wss.clients.forEach((client) => {
      if (client !== excludeWs && client.readyState === 1) {
        client.send(messageString)
      }
    })
  }

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
