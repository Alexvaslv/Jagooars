import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import path from "path";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;

  // In-memory state
  let profileState = {
    followers: 12500,
    following: 1042,
    posts: Array.from({ length: 9 }).map((_, i) => ({
      id: i,
      seed: i + 10,
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100)
    }))
  };

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    // Send initial state
    socket.emit("initial_state", profileState);

    socket.on("toggle_follow", (isFollowing) => {
      if (isFollowing) {
        profileState.followers += 1;
      } else {
        profileState.followers -= 1;
      }
      io.emit("followers_update", profileState.followers);
    });

    socket.on("like_post", (postId) => {
      const post = profileState.posts.find(p => p.id === postId);
      if (post) {
        post.likes += 1;
        io.emit("post_updated", post);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
