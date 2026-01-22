# onNewBlock Callback - Complete Usage Guide

## Quick Answer: **YES, the callback is available for external projects!** ✅

---

## 🚀 How to Use It

### Option 1: Standalone Script (Easiest for HTML pages)

```html
<script src="https://cdn.cloud.weni.ai/webchat-latest.umd.js"></script>
<script>
  window.WebChat.init({
    selector: '#weni-webchat',
    socketUrl: 'https://websocket.weni.ai',
    host: 'https://flows.weni.ai',
    channelUuid: 'YOUR-CHANNEL-UUID',
    
    // ADD THIS: Your callback function
    onNewBlock: (block) => {
      console.log('Received block:', block);
      // block = "[[TAG_NAME]]content[[/TAG_NAME]]"
    }
  });
</script>
```

### Option 2: React Component (For React apps)

```jsx
import { Widget } from '@weni/webchat-template-react';

function App() {
  const handleBlock = (block) => {
    console.log('Block detected:', block);
    // Your processing logic
  };

  return (
    <Widget
      config={{
        socketUrl: 'wss://...',
        host: 'https://...',
        channelUuid: 'YOUR-UUID',
        onNewBlock: handleBlock,  // ← ADD THIS
      }}
    />
  );
}
```

### Option 3: Direct Import (Advanced)

```javascript
import { 
  filterMessageTags, 
  StreamingMessageFilter 
} from '@weni/webchat-template-react';

// For complete messages
const result = filterMessageTags('Text [[TAG]]data[[/TAG]]', {
  onNewBlock: (block) => console.log(block)
});

// For streaming messages
const filter = new StreamingMessageFilter({
  onNewBlock: (block) => console.log(block)
});
```

---

## 📦 What You Receive

The callback receives the **complete block as a string**, including tags:

```javascript
onNewBlock: (block) => {
  // Examples of what you receive:
  
  // Simple block:
  "[[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]"
  
  // Multi-line block:
  "[[RESULTS]]Item 1\nItem 2\nItem 3[[/RESULTS]]"
  
  // Nested block (outer):
  "[[OUTER]]text [[INNER]]nested[[/INNER]] more[[/OUTER]]"
  
  // JSON content:
  '[[CONFIG]]{"theme":"dark","lang":"en"}[[/CONFIG]]'
}
```

---

## 🔧 Parse the Block

Use this helper to extract tag name and content:

```javascript
function parseBlock(block) {
  const match = block.match(/\[\[([A-Z0-9_-]+)\]\](.*?)\[\[\/\1\]\]/s);
  
  if (!match) return null;
  
  return {
    tagName: match[1],    // e.g., "SEARCH_RESULT"
    content: match[2],    // e.g., "NEXUS-1234"
    fullBlock: match[0],  // Original block
  };
}

// Usage:
onNewBlock: (block) => {
  const parsed = parseBlock(block);
  if (parsed) {
    console.log('Tag:', parsed.tagName);
    console.log('Content:', parsed.content);
  }
}
```

---

## 💡 Real-World Examples

### Example 1: Track Search Results

```javascript
window.WebChat.init({
  // ... config
  onNewBlock: (block) => {
    const parsed = parseBlock(block);
    
    if (parsed?.tagName === 'SEARCH_RESULT') {
      // Extract ticket IDs
      const tickets = parsed.content.split('\n').filter(Boolean);
      
      // Display in your UI
      displayTickets(tickets);
      
      // Track analytics
      analytics.track('search_results_received', {
        count: tickets.length,
        tickets: tickets
      });
    }
  }
});
```

### Example 2: User Identification

```javascript
window.WebChat.init({
  // ... config
  onNewBlock: (block) => {
    const parsed = parseBlock(block);
    
    if (parsed?.tagName === 'USER_ID') {
      // Identify user in analytics
      analytics.identify(parsed.content, {
        source: 'webchat'
      });
      
      // Update UI
      document.querySelector('.user-badge').textContent = parsed.content;
    }
  }
});
```

### Example 3: Dynamic UI Components (React)

```jsx
import React, { useState } from 'react';
import { Widget } from '@weni/webchat-template-react';

function ChatWithMetadata() {
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const handleBlock = (block) => {
    const parsed = parseBlock(block);
    if (!parsed) return;

    switch (parsed.tagName) {
      case 'SEARCH_RESULT':
        const items = parsed.content.split('\n').filter(Boolean);
        setSearchResults(items);
        break;

      case 'NOTIFICATION':
        setNotifications(prev => [...prev, {
          id: Date.now(),
          message: parsed.content
        }]);
        break;

      case 'USER_DATA':
        try {
          const data = JSON.parse(parsed.content);
          updateUserProfile(data);
        } catch (e) {
          console.error('Invalid user data');
        }
        break;
    }
  };

  return (
    <div className="app">
      <Widget config={{ onNewBlock: handleBlock, ... }} />
      
      {/* Search Results Panel */}
      {searchResults.length > 0 && (
        <aside className="results-panel">
          <h3>Search Results</h3>
          <ul>
            {searchResults.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </aside>
      )}
      
      {/* Notifications */}
      {notifications.map(notif => (
        <Toast key={notif.id} message={notif.message} />
      ))}
    </div>
  );
}
```

---

## ⏱️ Timing: When is the Callback Called?

### Standard (Complete) Messages
```javascript
// Message received: "A [[TAG1]]x[[/TAG1]] B [[TAG2]]y[[/TAG2]]"

onNewBlock: (block) => {
  // Called AFTER full message parsing
  // Call 1: "[[TAG1]]x[[/TAG1]]"
  // Call 2: "[[TAG2]]y[[/TAG2]]"
  // Both calls happen immediately after message is fully parsed
}
```

### Streaming Messages

```javascript
// Chunk 1: "Results [[SEARCH_"
// Chunk 2: "RESULT]]data[[/SEARCH"
// Chunk 3: "_RESULT]]"

onNewBlock: (block) => {
  // Called IMMEDIATELY when block completes (after chunk 3)
  // Block: "[[SEARCH_RESULT]]data[[/SEARCH_RESULT]]"
  // This enables real-time processing during streaming!
}
```

---

## 🎯 What Gets Filtered vs What You Receive

| Message Text | User Sees | You Receive via Callback |
|-------------|-----------|-------------------------|
| `Results [[TAG]]data[[/TAG]]` | `"Results "` | `"[[TAG]]data[[/TAG]]"` |
| `[[A]]x[[/A]] text [[B]]y[[/B]]` | `" text "` | `"[[A]]x[[/A]]"` and `"[[B]]y[[/B]]"` |
| `Text [[OUTER]]a [[INNER]]b[[/INNER]] c[[/OUTER]]` | `"Text "` | `"[[INNER]]b[[/INNER]]"` and `"[[OUTER]]a [[INNER]]b[[/INNER]] c[[/OUTER]]"` |
| `No tags here` | `"No tags here"` | *(callback not called)* |
| `[[TAG]]incomplete` | `""` | *(callback not called - incomplete tag)* |

---

## 📋 Complete Integration Checklist

- [ ] Install/import `@weni/webchat-template-react`
- [ ] Add `onNewBlock` to your `init()` config or `<Widget>` props
- [ ] Implement your callback function
- [ ] Add parseBlock() helper (see examples)
- [ ] Test with sample messages containing tags
- [ ] Handle errors (wrap in try-catch)
- [ ] Consider logging/analytics for debugging
- [ ] Test with nested tags
- [ ] Test with streaming messages (if applicable)
- [ ] Document your tag format for your backend team

---

## 🐛 Troubleshooting

### Callback Not Being Called?

**✅ Check tag format**:
```javascript
// ✅ Valid
"[[TAG]]content[[/TAG]]"
"[[TAG_NAME]]content[[/TAG_NAME]]"
"[[TAG-123]]content[[/TAG-123]]"

// ❌ Invalid
"[TAG]content[/TAG]"      // Single brackets
"[[tag]]content[[/tag]]"  // Lowercase
"[[TAG]]content[[TAG]]"   // Missing / in closing
```

**✅ Verify callback is registered**:
```javascript
// Test directly
import { filterMessageTags } from '@weni/webchat-template-react';

filterMessageTags('Test [[TAG]]content[[/TAG]]', {
  onNewBlock: (block) => console.log('✅ Working:', block)
});
```

**✅ Check browser console**: Look for errors or warnings

### Getting Duplicate Calls?

This is **expected** for:
- Messages with multiple tags (one call per tag)
- Nested tags (inner calls first, then outer)

### Callback Not Working in Production Build?

Make sure you're using version `1.4.3+` that includes the block extraction feature.

Check exports:
```javascript
import { filterMessageTags } from '@weni/webchat-template-react';
console.log(typeof filterMessageTags); // Should be "function"
```

---

## 📚 Additional Resources

- **[Block Extraction API](./BLOCK_EXTRACTION.md)** - Complete API documentation
- **[README.md](../README.md)** - General webchat configuration
- **[Live Example](../examples/block-extraction-example.html)** - Working demo
- **[messageFilter.js](../src/utils/messageFilter.js)** - Implementation source code

---

## 🎓 Summary

**YES! The callback IS available for external projects in 3 ways:**

1. **Standalone (UMD)**: Pass `onNewBlock` to `window.WebChat.init()`
2. **React Component**: Pass `onNewBlock` in `config` prop to `<Widget>`
3. **Direct Import**: Import utilities and use them directly

The callback receives the full block string and is called:
- After parsing (standard messages)
- Immediately when complete (streaming messages)

**Ready to use in production!** ✅
