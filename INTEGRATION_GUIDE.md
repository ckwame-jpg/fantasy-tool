# Platform Integration Guide

##  **Sleeper Integration**

### How to Connect:
1. Switch to **Online Mode** in your draftboard
2. Select **Sleeper** as your platform
3. Get your Draft ID from your Sleeper draft URL:
   - URL: `https://sleeper.app/draft/nfl/123456789`
   - Draft ID: `123456789`
4. Enter the Draft ID and click **Connect**

### What It Does:
- **Real-time sync**: Pulls all picks from your live Sleeper draft every 5 seconds
- **Auto-import**: Converts Sleeper picks to your draftboard format
- **Seamless tracking**: No need to manually enter picks
- **Always up-to-date**: Your draftboard mirrors the live draft

---

## 🚧 **ESPN Integration** (In the works)

ESPN's fantasy API requires authentication setup, which makes it more complex to implement. Working on:

- **OAuth integration** for secure access
- **Private league support** with proper authentication
- **Real-time draft tracking** similar to Sleeper

**Timeline**: Next major update

---

## 🚧 **NFL.com Integration** (In the works)

NFL.com has limited public API access, exploring:

- **Web scraping methods** for public leagues
- **Browser extension** approach for private leagues
- **Manual import tools** as an interim solution

**Timeline**: Future update

---

## 💡 **How Live Sync Works**

1. **Connect**: Enter your platform's draft ID
2. **Sync**: App polls the platform API every 5 seconds
3. **Import**: New picks are automatically added to your draftboard
4. **Track**: Follow along with the full draft in real-time
5. **Save**: Everything is auto-saved to your backend and localStorage

---

## 🎯 **Use Cases**

### **For Commissioners:**
- Track your league's live draft
- Share the draftboard link with league members
- Keep everyone updated on picks

### **For League Members:**
- Follow along during the draft
- See who's been picked without refreshing platforms
- Plan your next picks based on real-time data

### **For Multi-League Players:**
- Track multiple drafts simultaneously
- Compare draft strategies across leagues
- Stay informed without switching between apps

---

## 🛠 **Technical Details**

- **Sleeper API**: Uses official read-only endpoints
- **Rate limiting**: Respects 1000 calls/minute limit
- **Error handling**: Graceful fallbacks and user feedback
- **Data mapping**: Converts platform data to unified format
- **Performance**: Efficient polling with smart caching
