# Block Extraction API

The Weni Webchat automatically filters metadata tags in the format `[[TAG_NAME]]content[[/TAG_NAME]]` from displayed messages. This API allows you to capture these filtered blocks for processing.

## Overview

**Problem**: Your backend sends messages with metadata embedded in tags:
```
Results [[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]
```

**Solution**: 
- ✅ User sees: `"Results "`
- ✅ Your app receives: `"[[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]"` via callback

---

## Usage for External Projects

### Method 1: Standalone Script (UMD Bundle)

```html
<div id="weni-webchat"></div>

<script src="https://cdn.cloud.weni.ai/webchat-latest.umd.js"></script>
<script>
  window.WebChat.init({
    selector: '#weni-webchat',
    socketUrl: 'https://websocket.weni.ai',
    host: 'https://flows.weni.ai',
    channelUuid: 'YOUR-CHANNEL-UUID',
    
    // Block extraction callback
    onNewBlock: function(block) {
      console.log('Received block:', block);
      // Example: "[[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]"
      
      // Parse the block
      const match = block.match(/\[\[(\w+)\]\](.*?)\[\[\/\1\]\]/s);
      if (match) {
        const [fullMatch, tagName, content] = match;
        
        switch(tagName) {
          case 'SEARCH_RESULT':
            handleSearchResult(content);
            break;
          case 'USER_ID':
            identifyUser(content);
            break;
          case 'ANALYTICS':
            trackEvent(content);
            break;
        }
      }
    }
  });
  
  function handleSearchResult(data) {
    // Your custom logic
    console.log('Search result:', data);
  }
</script>
```

### Method 2: React Component Import

```javascript
import React from 'react';
import { Widget } from '@weni/webchat-template-react';

function MyApp() {
  const handleBlock = (block) => {
    console.log('Block detected:', block);
    
    // Extract tag name and content
    const match = block.match(/\[\[(\w+)\]\](.*?)\[\[\/\1\]\]/s);
    if (match) {
      const [, tagName, content] = match;
      
      // Process based on tag type
      if (tagName === 'SEARCH_RESULT') {
        // Update your app state
        setSearchResults(JSON.parse(content));
      }
    }
  };

  return (
    <Widget
      config={{
        socketUrl: 'https://websocket.weni.ai',
        host: 'https://flows.weni.ai',
        channelUuid: 'YOUR-CHANNEL-UUID',
        onNewBlock: handleBlock,
      }}
    />
  );
}
```

### Method 3: Direct Utility Import (Advanced)

If you're building custom message renderers:

```javascript
import { filterMessageTags } from '@weni/webchat-template-react';

// Process a message manually
const messageText = 'Results [[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]';

const result = filterMessageTags(messageText, {
  onNewBlock: (block) => {
    console.log('Block:', block);
  }
});

console.log(result.text);        // "Results "
console.log(result.blocks);      // ["[[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]"]
console.log(result.tagsRemoved); // 1
```

---

## Callback Behavior

### Standard (Non-Streaming) Messages

**Timing**: Callback is invoked **after the entire message is parsed** with all blocks

```javascript
// Message: "A [[TAG1]]x[[/TAG1]] B [[TAG2]]y[[/TAG2]] C"

onNewBlock: (block) => {
  // Called twice, after full message parsing:
  // 1st call: "[[TAG1]]x[[/TAG1]]"
  // 2nd call: "[[TAG2]]y[[/TAG2]]"
}
```

### Streaming Messages

**Timing**: Callback is invoked **immediately when each block completes** during streaming

```javascript
// Streaming chunks:
// Chunk 1: "Results [[SEARCH_"
// Chunk 2: "RESULT]]NEXUS-"
// Chunk 3: "1234[[/SEARCH_RESULT]]"

onNewBlock: (block) => {
  // Called immediately when chunk 3 completes the tag
  // Block: "[[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]"
}
```

For streaming, use `StreamingMessageFilter`:

```javascript
import { StreamingMessageFilter } from '@weni/webchat-template-react';

const filter = new StreamingMessageFilter({
  onNewBlock: (block) => {
    console.log('Block completed:', block);
    // Process block in real-time as stream progresses
  }
});

// Process chunks as they arrive
let visibleText = '';
visibleText += filter.processChunk('Results [[TAG');  // No callback yet
visibleText += filter.processChunk(']]hidden[[/TAG]]'); // Callback fires!
visibleText += filter.processChunk(' more text');       // No callback

console.log(visibleText); // "Results  more text"
console.log(filter.blocks); // ["[[TAG]]hidden[[/TAG]]"]
```

---

## Real-World Examples

### Example 1: Search Results Display

```javascript
window.WebChat.init({
  // ... other config
  onNewBlock: (block) => {
    const match = block.match(/\[\[SEARCH_RESULT\]\](.*?)\[\[\/SEARCH_RESULT\]\]/s);
    if (match) {
      const ticketIds = match[1].split('\n').filter(Boolean);
      displaySearchResults(ticketIds);
    }
  }
});

function displaySearchResults(ids) {
  const resultsPanel = document.getElementById('search-results');
  resultsPanel.innerHTML = ids.map(id => 
    `<div class="result-item">${id}</div>`
  ).join('');
}
```

### Example 2: User Identification

```javascript
window.WebChat.init({
  // ... other config
  onNewBlock: (block) => {
    const match = block.match(/\[\[USER_ID\]\](.*?)\[\[\/USER_ID\]\]/s);
    if (match) {
      const userId = match[1];
      
      // Track user
      analytics.identify(userId);
      
      // Update UI
      document.getElementById('user-badge').textContent = userId;
    }
  }
});
```

### Example 3: Analytics Tracking

```javascript
window.WebChat.init({
  // ... other config
  onNewBlock: (block) => {
    const match = block.match(/\[\[ANALYTICS\]\](.*?)\[\[\/ANALYTICS\]\]/s);
    if (match) {
      try {
        const eventData = JSON.parse(match[1]);
        
        // Track event
        analytics.track(eventData.event, {
          category: eventData.category,
          label: eventData.label,
          value: eventData.value
        });
      } catch (e) {
        console.error('Failed to parse analytics data:', e);
      }
    }
  }
});
```

### Example 4: Dynamic Component Rendering

```javascript
import React, { useState } from 'react';
import { Widget } from '@weni/webchat-template-react';

function ChatWithDynamicComponents() {
  const [searchResults, setSearchResults] = useState([]);
  const [userData, setUserData] = useState(null);

  const handleBlock = (block) => {
    // Extract tag name and content
    const match = block.match(/\[\[(\w+)\]\](.*?)\[\[\/\1\]\]/s);
    if (!match) return;
    
    const [, tagName, content] = match;
    
    switch (tagName) {
      case 'SEARCH_RESULT':
        // Parse and display search results
        const items = content.split('\n').filter(Boolean);
        setSearchResults(items);
        break;
        
      case 'USER_DATA':
        // Update user profile
        try {
          setUserData(JSON.parse(content));
        } catch (e) {
          console.error('Invalid user data:', e);
        }
        break;
        
      case 'NOTIFICATION':
        // Show notification
        showNotification(content);
        break;
    }
  };

  return (
    <div className="app">
      <Widget
        config={{
          socketUrl: 'wss://socket.example.com',
          host: 'https://api.example.com',
          channelUuid: 'abc-123',
          onNewBlock: handleBlock,
        }}
      />
      
      {/* Dynamic components based on extracted blocks */}
      {searchResults.length > 0 && (
        <aside className="search-results">
          <h3>Search Results</h3>
          <ul>
            {searchResults.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </aside>
      )}
      
      {userData && (
        <div className="user-profile">
          <h4>{userData.name}</h4>
          <p>{userData.email}</p>
        </div>
      )}
    </div>
  );
}
```

---

## API Reference

### `onNewBlock` Callback

**Signature**: `(block: string) => void`

**Parameters**:
- `block` (string): The complete block including opening and closing tags

**Example block strings**:
- `"[[TAG]]content[[/TAG]]"`
- `"[[SEARCH_RESULT]]NEXUS-1234\nEXPERI-5678[[/SEARCH_RESULT]]"`
- `"[[USER_ID]]user-abc-123[[/USER_ID]]"`

**Called**:
- **Standard messages**: After full message parsing (all blocks at once)
- **Streaming messages**: Immediately when each block completes

**Not called when**:
- Message has no tags
- Tags are malformed (e.g., `[SINGLE]`, `[[ TAG ]]`)
- Opening tag has no matching closing tag

---

## Parsing Helper

Use this regex to extract tag name and content:

```javascript
function parseBlock(block) {
  // Match [[TAG_NAME]]content[[/TAG_NAME]]
  const match = block.match(/\[\[([A-Z0-9_-]+)\]\](.*?)\[\[\/\1\]\]/s);
  
  if (!match) return null;
  
  return {
    fullBlock: match[0],
    tagName: match[1],
    content: match[2],
  };
}

// Usage
onNewBlock: (block) => {
  const parsed = parseBlock(block);
  if (parsed) {
    console.log('Tag:', parsed.tagName);
    console.log('Content:', parsed.content);
  }
}
```

---

## Nested Tags

When messages contain nested tags, each tag is extracted separately:

```javascript
// Message: "Text [[OUTER]]outer [[INNER]]inner[[/INNER]] more[[/OUTER]]"

onNewBlock: (block) => {
  // Called twice:
  // 1st: "[[INNER]]inner[[/INNER]]"
  // 2nd: "[[OUTER]]outer [[INNER]]inner[[/INNER]] more[[/OUTER]]"
  //      ^ Note: outer block includes the complete inner block
}
```

---

## Multiple Blocks

Process multiple blocks from a single message:

```javascript
const allBlocks = [];

window.WebChat.init({
  // ... config
  onNewBlock: (block) => {
    allBlocks.push(block);
    
    // Process each block
    const parsed = parseBlock(block);
    if (parsed) {
      processMetadata(parsed.tagName, parsed.content);
    }
  }
});
```

---

## Best Practices

### 1. Error Handling

Always wrap parsing in try-catch:

```javascript
onNewBlock: (block) => {
  try {
    const parsed = parseBlock(block);
    if (parsed) {
      handleMetadata(parsed);
    }
  } catch (error) {
    console.error('Failed to process block:', error);
    // Optionally report to error tracking
    reportError(error, { block });
  }
}
```

### 2. Type Safety (TypeScript)

```typescript
interface BlockData {
  fullBlock: string;
  tagName: string;
  content: string;
}

const config = {
  // ... other config
  onNewBlock: (block: string): void => {
    const parsed: BlockData | null = parseBlock(block);
    if (parsed) {
      handleMetadata(parsed);
    }
  }
};
```

### 3. Performance

For high-volume messages, debounce or batch processing:

```javascript
let blockQueue = [];
let processTimer = null;

onNewBlock: (block) => {
  blockQueue.push(block);
  
  // Batch process every 100ms
  clearTimeout(processTimer);
  processTimer = setTimeout(() => {
    processBatch(blockQueue);
    blockQueue = [];
  }, 100);
}
```

### 4. State Management (React)

```javascript
function MyApp() {
  const [metadata, setMetadata] = useState([]);

  const handleBlock = useCallback((block) => {
    const parsed = parseBlock(block);
    if (parsed) {
      setMetadata(prev => [...prev, {
        timestamp: Date.now(),
        tagName: parsed.tagName,
        content: parsed.content
      }]);
    }
  }, []);

  return <Widget config={{ onNewBlock: handleBlock, ... }} />;
}
```

---

## Testing Your Integration

### Test Message Examples

Send these test messages through your backend to verify the callback:

```javascript
// Test 1: Simple block
"Results [[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]"
// Expected callback: "[[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]"

// Test 2: Multiple blocks
"User [[USER_ID]]abc-123[[/USER_ID]] has [[STATUS]]ACTIVE[[/STATUS]]"
// Expected callbacks (2):
// - "[[USER_ID]]abc-123[[/USER_ID]]"
// - "[[STATUS]]ACTIVE[[/STATUS]]"

// Test 3: Nested blocks
"Data [[OUTER]]outer [[INNER]]inner[[/INNER]] more[[/OUTER]]"
// Expected callbacks (2):
// - "[[INNER]]inner[[/INNER]]"
// - "[[OUTER]]outer [[INNER]]inner[[/INNER]] more[[/OUTER]]"

// Test 4: JSON content
'Config [[SETTINGS]]{"theme":"dark","lang":"en"}[[/SETTINGS]]'
// Expected callback: '[[SETTINGS]]{"theme":"dark","lang":"en"}[[/SETTINGS]]'
```

### Debug Mode

Enable debug logging:

```javascript
window.WebChat.init({
  // ... config
  onNewBlock: (block) => {
    console.group('📦 Block Detected');
    console.log('Raw block:', block);
    console.log('Length:', block.length);
    
    const parsed = parseBlock(block);
    if (parsed) {
      console.log('Tag name:', parsed.tagName);
      console.log('Content:', parsed.content);
      console.log('Content length:', parsed.content.length);
    }
    console.groupEnd();
  }
});
```

---

## Common Patterns

### Pattern 1: Route to Different Handlers

```javascript
const blockHandlers = {
  SEARCH_RESULT: (content) => {
    displaySearchResults(content.split('\n'));
  },
  USER_ID: (content) => {
    analytics.identify(content);
  },
  ANALYTICS: (content) => {
    const data = JSON.parse(content);
    analytics.track(data.event, data.properties);
  },
  NOTIFICATION: (content) => {
    showToast(content);
  }
};

onNewBlock: (block) => {
  const parsed = parseBlock(block);
  if (parsed && blockHandlers[parsed.tagName]) {
    blockHandlers[parsed.tagName](parsed.content);
  }
}
```

### Pattern 2: Store All Metadata

```javascript
const metadata = [];

onNewBlock: (block) => {
  metadata.push({
    timestamp: Date.now(),
    block: block,
    parsed: parseBlock(block)
  });
  
  // Store in localStorage
  localStorage.setItem('chat_metadata', JSON.stringify(metadata));
}
```

### Pattern 3: Conditional Processing

```javascript
onNewBlock: (block) => {
  const parsed = parseBlock(block);
  if (!parsed) return;
  
  // Only process certain tag types
  const allowedTags = ['SEARCH_RESULT', 'USER_ID', 'ANALYTICS'];
  if (!allowedTags.includes(parsed.tagName)) {
    console.log('Ignoring tag:', parsed.tagName);
    return;
  }
  
  processMetadata(parsed);
}
```

---

## Limitations & Edge Cases

### What Gets Extracted

✅ **Captured**:
- Valid matched tags: `[[TAG]]content[[/TAG]]`
- Nested tags: Both inner and outer blocks
- Empty tags: `[[TAG]][[/TAG]]`
- Multi-line content: `[[TAG]]line1\nline2[[/TAG]]`

❌ **Not captured**:
- Unmatched opening tags: `[[TAG]]incomplete`
- Unmatched closing tags: `text[[/TAG]]`
- Malformed patterns: `[SINGLE]`, `[[ TAG ]]`, `[[tag with space]]`
- Case mismatches: `[[TAG]]content[[/tag]]`

### Tag Name Requirements

Valid tag names must match: `[A-Z0-9_-]+`

✅ Valid:
- `[[TAG]]`
- `[[TAG_NAME]]`
- `[[TAG-WITH-DASH]]`
- `[[TAG123]]`
- `[[SEARCH_RESULT]]`

❌ Invalid (won't be extracted):
- `[[tag]]` (lowercase)
- `[[TAG NAME]]` (space)
- `[[tag_name]]` (lowercase)
- `[[Tág]]` (special chars)

---

## Troubleshooting

### Callback Not Being Called

**Check 1**: Verify tag format is correct
```javascript
// ✅ Correct
"[[TAG]]content[[/TAG]]"

// ❌ Incorrect
"[TAG]content[/TAG]"      // Single brackets
"[[tag]]content[[/tag]]"   // Lowercase
"[[TAG]]content[[TAG]]"    // Wrong closing format
```

**Check 2**: Verify callback is properly registered
```javascript
// Check config
console.log(window.WebChat.config.onNewBlock); // Should be your function
```

**Check 3**: Enable debug mode
```javascript
import { filterMessageTags } from '@weni/webchat-template-react';

// Test directly
const result = filterMessageTags('Test [[TAG]]content[[/TAG]]', {
  onNewBlock: (block) => console.log('✅ Callback working:', block)
});

console.log('Result:', result);
```

### Callback Called Multiple Times

This is **expected behavior** for:
- Messages with multiple tags (one call per tag)
- Nested tags (inner tag calls first, then outer)

If you only want one callback per message:

```javascript
let processingMessage = null;
const blocksPerMessage = new Map();

onNewBlock: (block) => {
  const messageId = getCurrentMessageId(); // Your logic to get current message ID
  
  if (!blocksPerMessage.has(messageId)) {
    blocksPerMessage.set(messageId, []);
  }
  
  blocksPerMessage.get(messageId).push(block);
  
  // Process all blocks when message completes
  // (implement your own message completion detection)
}
```

---

## Migration Guide

If you were previously parsing message text manually:

### Before (Manual Parsing)

```javascript
window.WebChat.init({
  // ... config
  handleNewUserMessage: (message) => {
    // Manual parsing (NO LONGER NEEDED)
    const matches = message.text.matchAll(/\[\[(\w+)\]\](.*?)\[\[\/\1\]\]/gs);
    for (const match of matches) {
      handleMetadata(match[1], match[2]);
    }
  }
});
```

### After (Using onNewBlock)

```javascript
window.WebChat.init({
  // ... config
  onNewBlock: (block) => {
    const parsed = parseBlock(block);
    if (parsed) {
      handleMetadata(parsed.tagName, parsed.content);
    }
  }
});
```

**Benefits**:
- ✅ Works with streaming messages
- ✅ Handles nested tags correctly
- ✅ Better performance (state machine vs regex)
- ✅ Automatic filtering from UI
- ✅ Consistent error handling

---

## Support & Questions

- GitHub Issues: [weni-ai/webchat-roadmap-prototype](https://github.com/weni-ai/webchat-roadmap-prototype)
- Documentation: See [README.md](../README.md) for general webchat usage
- API Reference: See [messageFilter.js](../src/utils/messageFilter.js) for implementation details
