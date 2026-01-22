# Quickstart: Programmatic Send Message API

**Feature**: 001-send-message-api  
**Version**: 1.0.0  
**Date**: 2026-01-22

## Overview

This guide shows you how to send messages programmatically using the `window.WebChat.send()` API. Perfect for triggering chat conversations from buttons, forms, page events, or any custom UI element.

---

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Common Use Cases](#common-use-cases)
3. [Advanced Usage](#advanced-usage)
4. [Error Handling](#error-handling)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Basic Usage

### Simple Text Message

Send a plain text message from anywhere in your code:

```javascript
window.WebChat.send('Hello, I need assistance');
```

### Message with Metadata

Send a message with additional contextual data:

```javascript
window.WebChat.send({
  text: 'I need help with my order',
  metadata: {
    source: 'help-button',
    page: '/checkout',
    orderId: 'ORD-12345'
  }
});
```

---

## Common Use Cases

### 1. Help Button

Trigger a support conversation when users click a "Get Help" button:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Store</title>
</head>
<body>
  <!-- Your page content -->
  <div class="product-page">
    <h1>Product Details</h1>
    <button id="help-btn" class="help-button">Need Help?</button>
  </div>

  <!-- Webchat widget -->
  <div id="weni-webchat"></div>

  <!-- Load WebChat -->
  <script src="https://cdn.cloud.weni.ai/webchat-latest.umd.js"></script>
  <script>
    // Initialize WebChat
    window.WebChat.init({
      selector: '#weni-webchat',
      socketUrl: 'https://websocket.weni.ai',
      host: 'https://flows.weni.ai',
      channelUuid: 'YOUR-CHANNEL-UUID'
    });

    // Help button click handler
    document.getElementById('help-btn').addEventListener('click', () => {
      window.WebChat.send({
        text: 'I need help with this product',
        metadata: {
          source: 'help-button',
          page: window.location.pathname,
          product: 'PRD-12345'
        }
      });
    });
  </script>
</body>
</html>
```

**Result**: When user clicks "Need Help?", the chat opens with the message pre-sent.

---

### 2. Contact Form Integration

Automatically start a chat conversation when a contact form is submitted:

```html
<form id="contact-form">
  <input type="text" id="name" placeholder="Your Name" required />
  <input type="email" id="email" placeholder="Your Email" required />
  <textarea id="message" placeholder="Your Message" required></textarea>
  <button type="submit">Send via Chat</button>
</form>

<div id="weni-webchat"></div>

<script src="https://cdn.cloud.weni.ai/webchat-latest.umd.js"></script>
<script>
  window.WebChat.init({
    selector: '#weni-webchat',
    socketUrl: 'https://websocket.weni.ai',
    host: 'https://flows.weni.ai',
    channelUuid: 'YOUR-CHANNEL-UUID'
  });

  document.getElementById('contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;
    
    // Send to webchat
    window.WebChat.send({
      text: message,
      metadata: {
        source: 'contact-form',
        name: name,
        email: email,
        timestamp: new Date().toISOString()
      }
    });
    
    // Optional: Clear form
    e.target.reset();
  });
</script>
```

**Result**: Form submission triggers chat with message and metadata attached.

---

### 3. Quick Action Buttons

Create multiple quick action buttons for common queries:

```html
<div class="quick-actions">
  <h3>How can we help?</h3>
  <button onclick="askAboutShipping()">Shipping Info</button>
  <button onclick="askAboutReturns()">Return Policy</button>
  <button onclick="askAboutPayment()">Payment Options</button>
  <button onclick="trackOrder()">Track My Order</button>
</div>

<div id="weni-webchat"></div>

<script src="https://cdn.cloud.weni.ai/webchat-latest.umd.js"></script>
<script>
  window.WebChat.init({
    selector: '#weni-webchat',
    socketUrl: 'https://websocket.weni.ai',
    host: 'https://flows.weni.ai',
    channelUuid: 'YOUR-CHANNEL-UUID'
  });

  function askAboutShipping() {
    window.WebChat.send({
      text: 'What are your shipping options?',
      metadata: { intent: 'shipping', source: 'quick-action' }
    });
  }

  function askAboutReturns() {
    window.WebChat.send({
      text: 'What is your return policy?',
      metadata: { intent: 'returns', source: 'quick-action' }
    });
  }

  function askAboutPayment() {
    window.WebChat.send({
      text: 'What payment methods do you accept?',
      metadata: { intent: 'payment', source: 'quick-action' }
    });
  }

  function trackOrder() {
    const orderId = prompt('Enter your order number:');
    if (orderId) {
      window.WebChat.send({
        text: `Track order ${orderId}`,
        metadata: { 
          intent: 'tracking', 
          orderId: orderId,
          source: 'quick-action'
        }
      });
    }
  }
</script>
```

**Result**: Each button sends a predefined message with specific intent metadata.

---

### 4. E-commerce Cart Abandonment

Trigger a helpful message when user is about to leave with items in cart:

```javascript
// Initialize WebChat
window.WebChat.init({
  selector: '#weni-webchat',
  socketUrl: 'https://websocket.weni.ai',
  host: 'https://flows.weni.ai',
  channelUuid: 'YOUR-CHANNEL-UUID'
});

// Detect mouse leaving viewport (cart abandonment signal)
let cartAbandoned = false;

document.addEventListener('mouseleave', (e) => {
  if (e.clientY <= 0 && !cartAbandoned) {
    const cartItems = getCartItems(); // Your cart function
    
    if (cartItems.length > 0) {
      cartAbandoned = true;
      
      window.WebChat.send({
        text: 'I have questions about my cart',
        metadata: {
          source: 'cart-abandonment',
          cartValue: getCartTotal(),
          itemCount: cartItems.length,
          items: cartItems.map(item => item.name)
        }
      });
    }
  }
});
```

**Result**: Proactively engages users before they leave.

---

### 5. Page-Specific Context

Send different messages based on which page the user is on:

```javascript
window.WebChat.init({
  selector: '#weni-webchat',
  socketUrl: 'https://websocket.weni.ai',
  host: 'https://flows.weni.ai',
  channelUuid: 'YOUR-CHANNEL-UUID'
});

function contextAwareHelp() {
  const page = window.location.pathname;
  let message = 'I need help';
  let metadata = { source: 'help-button', page: page };
  
  switch (page) {
    case '/pricing':
      message = 'I have questions about pricing';
      metadata.intent = 'pricing';
      break;
    case '/checkout':
      message = 'I need help completing my purchase';
      metadata.intent = 'checkout-help';
      break;
    case '/products':
      message = 'I need help finding the right product';
      metadata.intent = 'product-selection';
      break;
    case '/support':
      message = 'I need technical support';
      metadata.intent = 'technical-support';
      break;
  }
  
  window.WebChat.send({ text: message, metadata: metadata });
}

// Add to all help buttons
document.querySelectorAll('.help-button').forEach(btn => {
  btn.addEventListener('click', contextAwareHelp);
});
```

**Result**: Smarter, context-aware conversation starters.

---

### 6. User Onboarding Flow

Guide new users through onboarding with programmatic messages:

```javascript
window.WebChat.init({
  selector: '#weni-webchat',
  socketUrl: 'https://websocket.weni.ai',
  host: 'https://flows.weni.ai',
  channelUuid: 'YOUR-CHANNEL-UUID'
});

// Check if user is new
const isNewUser = !localStorage.getItem('returning_user');

if (isNewUser) {
  // Wait for webchat to initialize
  setTimeout(() => {
    window.WebChat.send({
      text: 'Hi! I\'m new here and would like a guided tour',
      metadata: {
        source: 'onboarding',
        userType: 'new',
        timestamp: Date.now()
      }
    });
    
    localStorage.setItem('returning_user', 'true');
  }, 2000); // 2 second delay for better UX
}
```

**Result**: Automatic onboarding conversation for new users.

---

## Advanced Usage

### Handling Connection States

Send messages even before the connection is established (they'll be queued automatically):

```javascript
// Initialize (connection may not be immediate)
window.WebChat.init({
  selector: '#weni-webchat',
  socketUrl: 'https://websocket.weni.ai',
  host: 'https://flows.weni.ai',
  channelUuid: 'YOUR-CHANNEL-UUID'
});

// Send immediately - will queue if not connected yet
window.WebChat.send('Quick question');
window.WebChat.send('Another message');
window.WebChat.send('Third message');

// All three messages will be sent in order once connected
```

**Behavior**: Messages are automatically queued and sent in order when connection is established.

---

### Rich Metadata for Analytics

Include comprehensive metadata for analytics and routing:

```javascript
window.WebChat.send({
  text: 'I need help with my premium subscription',
  metadata: {
    // User context
    userId: getCurrentUserId(),
    accountType: 'premium',
    signupDate: '2024-01-15',
    
    // Page context
    page: window.location.pathname,
    referrer: document.referrer,
    
    // Session context
    sessionId: getSessionId(),
    sessionDuration: getSessionDuration(),
    pageViews: getPageViewCount(),
    
    // Feature flags
    features: getActiveFeatures(),
    
    // Intent
    intent: 'subscription-help',
    urgency: 'high',
    
    // Timestamp
    timestamp: new Date().toISOString()
  }
});
```

**Use cases**:
- Route to specialized agents based on metadata
- Track conversion sources
- Provide context to support team
- Analytics and reporting

---

### Conditional Sending

Only send messages under certain conditions:

```javascript
function smartHelp() {
  // Check if user seems stuck
  const timeOnPage = Date.now() - pageLoadTime;
  const scrollDepth = getScrollDepth();
  const clickCount = getClickCount();
  
  // Proactive help after 30 seconds, minimal engagement
  if (timeOnPage > 30000 && scrollDepth < 0.3 && clickCount < 3) {
    window.WebChat.send({
      text: 'I\'m having trouble finding what I need',
      metadata: {
        source: 'proactive-help',
        timeOnPage: timeOnPage,
        scrollDepth: scrollDepth,
        clickCount: clickCount
      }
    });
  }
}

// Check every 10 seconds
setInterval(smartHelp, 10000);
```

---

### Sequential Message Flow

Send a series of messages with delays:

```javascript
async function sendOrderInquiry(orderId) {
  // First message
  window.WebChat.send({
    text: `I have a question about order ${orderId}`,
    metadata: { orderId: orderId, step: 1 }
  });
  
  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Second message (if user hasn't responded)
  window.WebChat.send({
    text: 'Specifically about the delivery date',
    metadata: { orderId: orderId, step: 2 }
  });
}
```

---

## Error Handling

### Validation Errors

The `send()` method validates input and logs warnings for invalid data:

```javascript
// ❌ These will log warnings and not send:
window.WebChat.send(null);           // "Message cannot be null or undefined"
window.WebChat.send('');             // "Message text cannot be empty"
window.WebChat.send(123);            // "Invalid message format"
window.WebChat.send({ });            // "Invalid message format" (no text field)

// ✅ These are valid:
window.WebChat.send('Valid text');
window.WebChat.send({ text: 'Valid' });
window.WebChat.send({ text: 'Valid', metadata: { key: 'value' } });
```

### Lifecycle Errors

Calling `send()` at the wrong time logs errors:

```javascript
// ❌ Before init
window.WebChat.send('Hello');
// Error: "Widget not initialized. Call init() first."

// ✅ After init
await window.WebChat.init({ /* config */ });
window.WebChat.send('Hello'); // Works

// ❌ After destroy
window.WebChat.destroy();
window.WebChat.send('Hello');
// Error: "Widget not initialized. Call init() first."
```

### Checking Widget State

Before calling `send()`, you can check if the widget is initialized:

```javascript
function safeSend(message) {
  if (window.WebChat && typeof window.WebChat.send === 'function') {
    window.WebChat.send(message);
  } else {
    console.warn('WebChat not available yet');
    // Optionally queue the message to send later
  }
}
```

---

## Best Practices

### 1. Initialize Early

Initialize WebChat as early as possible so it's ready when users trigger actions:

```javascript
// Good: Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  window.WebChat.init({ /* config */ });
});

// Bad: Initialize only when button is clicked
button.addEventListener('click', () => {
  window.WebChat.init({ /* config */ }); // May cause delay
  window.WebChat.send('Help'); // Will queue but feels slow
});
```

---

### 2. Use Descriptive Metadata

Always include context in metadata for better routing and analytics:

```javascript
// Good: Rich context
window.WebChat.send({
  text: 'I need help',
  metadata: {
    source: 'pricing-page-cta',
    page: '/pricing',
    plan: 'enterprise',
    intent: 'sales-inquiry'
  }
});

// Bad: No context
window.WebChat.send('I need help');
```

---

### 3. Keep Messages Natural

Write messages as if the user typed them:

```javascript
// Good: Natural language
window.WebChat.send('Can you help me reset my password?');

// Bad: Command-like
window.WebChat.send('PASSWORD_RESET_REQUEST');
```

---

### 4. Don't Spam Messages

Avoid sending too many messages in rapid succession:

```javascript
// Bad: Overwhelming
window.WebChat.send('Hello');
window.WebChat.send('I need help');
window.WebChat.send('With my order');
window.WebChat.send('Order #12345');

// Good: Single comprehensive message
window.WebChat.send({
  text: 'Hello, I need help with my order #12345',
  metadata: { orderId: '12345' }
});
```

---

### 5. Handle Race Conditions

If sending immediately after init, messages are automatically queued:

```javascript
// This works - messages will queue if needed
window.WebChat.init({ /* config */ });
window.WebChat.send('Quick question'); // Queued if not connected yet
```

---

### 6. Respect User Intent

Only send messages in response to explicit user actions:

```javascript
// Good: User clicked button
button.addEventListener('click', () => {
  window.WebChat.send('I need help');
});

// Bad: Unsolicited on page load
window.addEventListener('load', () => {
  window.WebChat.send('Do you need help?'); // Annoying!
});
```

---

## Troubleshooting

### Message Not Appearing

**Problem**: Called `send()` but message doesn't appear in chat.

**Solutions**:
1. Check console for errors/warnings
2. Verify `init()` was called first
3. Check if message is valid (not empty, correct format)
4. Ensure widget hasn't been destroyed

```javascript
// Debug
console.log('WebChat available:', !!window.WebChat);
console.log('Send function:', typeof window.WebChat?.send);
```

---

### Chat Not Opening

**Problem**: Message is sent but chat doesn't open.

**Possible causes**:
- Widget is in embedded mode (`embedded: true`)
- Custom CSS hiding the widget
- Service connection issue

**Solution**: Check configuration:
```javascript
window.WebChat.init({
  selector: '#weni-webchat',
  socketUrl: 'https://websocket.weni.ai',
  host: 'https://flows.weni.ai',
  channelUuid: 'YOUR-CHANNEL-UUID',
  embedded: false // Ensure not in embedded mode
});
```

---

### Messages Out of Order

**Problem**: Messages appear in wrong order.

**Cause**: Asynchronous sending with manual delays.

**Solution**: Use proper async/await:
```javascript
// Wrong
window.WebChat.send('First');
setTimeout(() => window.WebChat.send('Second'), 100);
window.WebChat.send('Third'); // May arrive before Second

// Right
window.WebChat.send('First');
await new Promise(r => setTimeout(r, 100));
window.WebChat.send('Second');
await new Promise(r => setTimeout(r, 100));
window.WebChat.send('Third');
```

---

### Metadata Not Received

**Problem**: Metadata doesn't appear on backend.

**Checks**:
1. Verify backend supports metadata in message payload
2. Check if service version supports metadata parameter
3. Ensure metadata is serializable (no functions, circular refs)

```javascript
// Good metadata
window.WebChat.send({
  text: 'Help',
  metadata: { orderId: '123', page: '/checkout' }
});

// Bad metadata (not serializable)
window.WebChat.send({
  text: 'Help',
  metadata: { 
    element: document.getElementById('btn'), // DOM elements not serializable
    callback: () => {} // Functions not serializable
  }
});
```

---

## Summary

The `window.WebChat.send()` API provides a simple yet powerful way to trigger chat conversations programmatically:

✅ **Simple**: Just call `send('text')` or `send({ text, metadata })`  
✅ **Reliable**: Messages queue automatically before connection  
✅ **Smart**: Chat opens automatically when you send  
✅ **Flexible**: Add rich metadata for routing and analytics  
✅ **Safe**: Built-in validation and error handling

**Next Steps**:
- Try the examples above in your application
- Explore metadata options for your use case
- Check the [API Contract](./contracts/send-api.contract.md) for full technical details
- Review the [Data Model](./data-model.md) for advanced usage

---

## Support

For issues or questions:
- Check browser console for warnings/errors
- Review this quickstart guide
- Refer to the main README for widget configuration
- Contact support with metadata from your messages for faster debugging
