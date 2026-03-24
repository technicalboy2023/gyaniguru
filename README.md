# 🧠 GyaniGuru — AI Chat, Image Generation & Blog Writer

**GyaniGuru** is a free AI tools platform offering intelligent chat, image generation, and SEO blog writing — all in one place.

🌐 **Live Site:** [https://technicalboy2023.github.io/gyaniguru/](https://technicalboy2023.github.io/gyaniguru/)

---

## ✨ Features

- 💬 **AI Chat** — Ask anything, get instant intelligent answers
- 🖼️ **Image Generator** — Generate AI images from text prompts *(coming soon)*
- ✍️ **Blog Writer** — Generate SEO-optimized blog posts in seconds
- ⚡ **5 Free Credits Daily** — No sign-up required to start
- 📱 **Fully Responsive** — Works on mobile, tablet, and desktop

---

## 🛠️ Tech Stack

- HTML5, CSS3, Tailwind CSS
- Vanilla JavaScript (no framework)
- n8n Webhooks (AI backend)
- Firebase Authentication
- GitHub Pages (hosting)

---

## 📁 Folder Structure

```
gyaniguru/
├── index.html           # Homepage
├── sitemap.xml          # SEO sitemap
├── robots.txt           # Search engine rules
├── og-image.jpg         # Social share image
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── main.js
│   ├── chat.js
│   ├── blog.js
│   └── image.js
├── services/
│   ├── api.js
│   ├── credits.js
│   └── history.js
├── agents/
│   ├── chat.html        # AI Chat tool
│   └── image.html       # Image Generator
└── tools/
    └── blog.html        # Blog Writer tool
```

---

## 🚀 Deploy on GitHub Pages

1. Fork or clone this repo
2. Set your n8n webhook URLs in `js/config.js`
3. Set your Firebase config in `js/firebase.js`
4. Enable GitHub Pages from repo Settings → Pages → Branch: `main`
5. Your site will be live at `https://technicalboy2023.github.io/gyaniguru/`

---

## ⚙️ Configuration

Edit `js/config.js` to set your webhook URLs:

```js
agents: {
  chat: {
    webhookUrl: 'https://your-n8n-instance.com/webhook/chat-agent',
  },
  blog: {
    webhookUrl: 'https://your-n8n-instance.com/webhook/blog-agent',
  }
}
```

---

## 📄 License

MIT License — free to use and modify.

---

> Built with ❤️ by [TechnicalBoy2023](https://github.com/technicalboy2023)