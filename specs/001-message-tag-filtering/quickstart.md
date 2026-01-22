# Quickstart: Message Tag Filtering

**Feature**: Message Tag Filtering (001-message-tag-filtering)  
**Date**: Thursday Jan 22, 2026  
**For**: Developers implementing this feature

## TL;DR

Create a utility function that removes `[[TAG_NAME]]content[[/TAG_NAME]]` patterns from message text before rendering. Integrate it into `MessageText.jsx` to filter incoming messages.

**Time to implement**: ~4-6 hours for P1 (standard messages)

---

## What You're Building

A text filtering system that:
- Removes metadata tags from messages: `[[TAG]]hidden[[/TAG]]` → visible text only
- Works with standard messages (P1) and streaming messages (P2)
- Processes text before markdown rendering
- Maintains <5ms performance for 10k character messages

**Example**:
```javascript
Input:  "Search results [[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]"
Output: "Search results "
```

---

## Prerequisites

- Node.js 16+ and npm installed
- Familiarity with React 18+ and hooks
- Understanding of state machines (helpful but not required)
- Jest testing framework knowledge

**Required files**:
- Spec: [spec.md](./spec.md)
- Research: [research.md](./research.md)
- Data Model: [data-model.md](./data-model.md)
- Contract: [contracts/messageFilter.contract.md](./contracts/messageFilter.contract.md)

---

## Implementation Phases

### Phase 1 (P1): Standard Message Filtering ⭐ **Start Here**

**Goal**: Filter tags from complete (non-streaming) messages

**Steps**:

1. **Create the utility module** (`src/utils/messageFilter.js`)
2. **Write unit tests** (`src/utils/messageFilter.test.js`)
3. **Integrate into MessageText** (`src/components/Messages/MessageText.jsx`)
4. **Add integration tests** (`src/components/Messages/MessageText.test.js`)
5. **Manual testing** in browser

**Estimated time**: 4-6 hours

---

### Phase 2 (P2): Streaming Message Support

**Goal**: Filter tags from progressive/streaming messages in real-time

**Steps**:

1. **Extend utility** with `StreamingMessageFilter` class
2. **Write streaming tests**
3. **Integrate into ChatContext** or message handler
4. **Test streaming scenarios**

**Estimated time**: 3-4 hours

---

### Phase 3 (P3): Multiple Tag Types

**Goal**: Ensure all tag types filtered consistently

**Steps**:

1. **Add test cases** for various tag names
2. **Documentation** and examples
3. **Performance testing** with complex messages

**Estimated time**: 1-2 hours

---

## Step-by-Step: Phase 1 Implementation

### Step 1: Create the Utility Module (30 minutes)

**File**: `src/utils/messageFilter.js`

**What to build**: A function that removes tag patterns using a state machine

**Starter code**:

```javascript
/**
 * Filter message tags from text
 * @param {string} text - Raw message text
 * @returns {FilterResult} Filtered text and metadata
 */
export function filterMessageTags(text) {
  // Early return optimization
  if (!text || typeof text !== 'string') {
    throw new TypeError('Text must be a string');
  }
  
  if (!text.includes('[[')) {
    return { text, hadTags: false, tagsRemoved: 0 };
  }
  
  // TODO: Implement state machine parser
  // States: TEXT, TAG_OPENING_1, TAG_OPENING_2, TAG_NAME, TAG_CONTENT, etc.
  // See data-model.md for state transition table
  
  return {
    text: filteredText,
    hadTags: tagsRemoved > 0,
    tagsRemoved
  };
}
```

**Key implementation details**:
- Use a character-by-character loop
- Track current state and buffers
- Handle state transitions based on current state + character
- See [data-model.md](./data-model.md) for complete state transition table

**Reference**: [contracts/messageFilter.contract.md](./contracts/messageFilter.contract.md) for full API spec

---

### Step 2: Write Unit Tests (1 hour)

**File**: `src/utils/messageFilter.test.js`

**Test structure**:

```javascript
import { filterMessageTags } from './messageFilter';

describe('messageFilter', () => {
  describe('filterMessageTags', () => {
    it('should remove simple tag', () => {
      const input = "Text [[TAG]]hidden[[/TAG]] visible";
      const result = filterMessageTags(input);
      
      expect(result.text).toBe("Text  visible");
      expect(result.hadTags).toBe(true);
      expect(result.tagsRemoved).toBe(1);
    });
    
    it('should handle no tags (early return)', () => {
      const input = "Just normal text";
      const result = filterMessageTags(input);
      
      expect(result.text).toBe(input);
      expect(result.hadTags).toBe(false);
      expect(result.tagsRemoved).toBe(0);
    });
    
    // TODO: Add more test cases from data-model.md fixtures
  });
});
```

**Required test coverage** (from contract):
- ✅ Simple tag removal
- ✅ Multiple tags
- ✅ Nested tags
- ✅ Unmatched opening/closing
- ✅ Malformed patterns
- ✅ Case sensitivity
- ✅ Empty messages
- ✅ Performance (<5ms for 10k chars)

**Run tests**:
```bash
npm test -- messageFilter.test.js
```

---

### Step 3: Integrate into MessageText (30 minutes)

**File**: `src/components/Messages/MessageText.jsx`

**Current code** (lines 20-24):
```javascript
const html = useMemo(() => {
  if (!message.text) return '';

  const purifiedContent = DOMPurify.sanitize(message.text);
  // ... rest of processing
}, [message.text, message.status]);
```

**Updated code**:
```javascript
import { filterMessageTags } from '@/utils/messageFilter';

const html = useMemo(() => {
  if (!message.text) return '';

  // NEW: Filter tags before sanitization
  const { text: filteredText } = filterMessageTags(message.text);
  
  // If message is empty after filtering, return empty
  if (!filteredText.trim()) return '';

  const purifiedContent = DOMPurify.sanitize(filteredText);
  // ... rest of processing (unchanged)
}, [message.text, message.status]);
```

**Why this approach**:
- Filters before DOMPurify (operates on raw text)
- Memoized for performance (only recomputes when message changes)
- Handles empty result case (messages with only tags)
- Non-breaking (all existing logic preserved)

---

### Step 4: Add Integration Tests (45 minutes)

**File**: `src/components/Messages/MessageText.test.js` (create if doesn't exist)

**Test structure**:

```javascript
import { render, screen } from '@testing-library/react';
import { MessageText } from './MessageText';

describe('MessageText with tag filtering', () => {
  it('should not display tagged content', () => {
    const message = {
      id: '1',
      type: 'text',
      text: 'Results [[TAG]]NEXUS-1234[[/TAG]]',
      timestamp: Date.now(),
      direction: 'incoming'
    };
    
    render(<MessageText message={message} componentsEnabled={true} />);
    
    expect(screen.getByText(/Results/i)).toBeInTheDocument();
    expect(screen.queryByText(/NEXUS-1234/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TAG/i)).not.toBeInTheDocument();
  });
  
  it('should preserve markdown after filtering', () => {
    const message = {
      id: '2',
      type: 'text',
      text: '[[TAG]]hidden[[/TAG]] **bold** text',
      timestamp: Date.now(),
      direction: 'incoming'
    };
    
    render(<MessageText message={message} componentsEnabled={true} />);
    
    // Markdown should still work
    const boldElement = screen.getByText(/bold/i);
    expect(boldElement.tagName).toBe('STRONG');
  });
  
  // TODO: Add more integration tests
});
```

**Run tests**:
```bash
npm test -- MessageText.test.js
```

---

### Step 5: Manual Testing (30 minutes)

**Test in browser**:

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Open browser console** and inject test messages:
   ```javascript
   // Simulate service sending a message with tags
   const testMessage = {
     id: Date.now().toString(),
     type: 'text',
     text: 'Here are results [[SEARCH_RESULT]]NEXUS-1234[[/SEARCH_RESULT]]',
     direction: 'incoming',
     timestamp: Date.now()
   };
   
   // Add to chat (depends on your dev setup)
   // Look for service instance or state setter
   ```

3. **Test cases to verify**:
   - ✅ Tags not visible in chat
   - ✅ Text before/after tags displays correctly
   - ✅ Markdown still renders (bold, links, lists)
   - ✅ Multiple tags in one message
   - ✅ Messages with no tags unchanged
   - ✅ Empty messages after filtering don't show

4. **Performance check**:
   - Open DevTools → Performance
   - Send long message with tags
   - Check message render time (<5ms additional overhead)

---

## Common Issues & Solutions

### Issue: Tests failing with "Cannot find module '@/utils/messageFilter'"

**Solution**: Check Jest module name mapper in `jest.config.js`:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1'
}
```

---

### Issue: Tags still visible in messages

**Possible causes**:
1. Filter not imported correctly
2. Filter applied after markdown parsing (should be before)
3. State machine logic incorrect

**Debug**:
```javascript
// Add console.log in MessageText.jsx
const { text: filteredText, hadTags } = filterMessageTags(message.text);
console.log('Original:', message.text);
console.log('Filtered:', filteredText);
console.log('Had tags:', hadTags);
```

---

### Issue: Performance slower than expected

**Possible causes**:
1. useMemo dependencies incorrect (re-running unnecessarily)
2. Not using early return optimization
3. Inefficient string concatenation

**Solutions**:
- Verify useMemo dependencies: `[message.text, message.status]`
- Ensure early return when no `[[` found
- Use array + join instead of string concatenation

---

### Issue: Markdown broken after filtering

**Cause**: Filter removing markdown syntax mistakenly

**Debug**:
- Check if markdown syntax matches tag pattern (unlikely)
- Verify filter runs before markdown parsing
- Test markdown-only message (no tags)

---

## Testing Checklist

Before submitting:

**Unit Tests**:
- [ ] All test cases from contract pass
- [ ] Performance test (<5ms for 10k chars) passes
- [ ] Edge cases covered (nested, unmatched, malformed)
- [ ] Code coverage >90%

**Integration Tests**:
- [ ] MessageText renders filtered text correctly
- [ ] Markdown preserved after filtering
- [ ] Quick replies/CTA unaffected
- [ ] Empty messages handled

**Manual Testing**:
- [ ] Tags not visible in browser
- [ ] Streaming messages smooth (if Phase 2)
- [ ] No console errors
- [ ] Performance acceptable

**Code Quality**:
- [ ] ESLint passes: `npm run lint`
- [ ] All tests pass: `npm test`
- [ ] No new warnings

---

## File Checklist

Files you'll create/modify:

**New Files**:
- [ ] `src/utils/messageFilter.js` (core logic)
- [ ] `src/utils/messageFilter.test.js` (unit tests)
- [ ] `src/components/Messages/MessageText.test.js` (integration tests, if new)

**Modified Files**:
- [ ] `src/components/Messages/MessageText.jsx` (add filter integration)

**Documentation**:
- [ ] Update README if adding new public API
- [ ] Add JSDoc comments to functions

---

## Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Unit test execution | <100ms | `npm test -- messageFilter.test.js --verbose` |
| Filter 10k chars | <5ms | Performance unit test |
| Message render time | +<5ms | DevTools Performance tab |
| Memory overhead | <4KB per message | Chrome Memory Profiler |

---

## Useful Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- messageFilter.test.js

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Start dev server
npm run dev

# Build for production
npm run build

# Run single test by name
npm test -- -t "should remove simple tag"
```

---

## Next Steps After P1

Once Phase 1 is complete:

1. **Review & Test**: Get code review, test in staging
2. **Phase 2 (Optional)**: Add streaming support if needed
3. **Documentation**: Update user-facing docs
4. **Monitoring**: Add metrics for tag removal stats
5. **Optimization**: Profile and optimize if needed

---

## Resources

**Internal Docs**:
- [spec.md](./spec.md) - Full feature specification
- [research.md](./research.md) - Architecture decisions
- [data-model.md](./data-model.md) - State machine details
- [contracts/messageFilter.contract.md](./contracts/messageFilter.contract.md) - API contract

**External References**:
- [React useMemo](https://react.dev/reference/react/useMemo) - Optimization
- [State Machines](https://en.wikipedia.org/wiki/Finite-state_machine) - Concepts
- [Jest Documentation](https://jestjs.io/) - Testing
- [React Testing Library](https://testing-library.com/react) - Component testing

**Tools**:
- Chrome DevTools Performance tab
- Jest code coverage: `npm test -- --coverage`
- Bundle analyzer (if needed for size check)

---

## Getting Help

**Questions about**:
- **Spec/Requirements**: Review [spec.md](./spec.md) and [research.md](./research.md)
- **API Contract**: See [contracts/messageFilter.contract.md](./contracts/messageFilter.contract.md)
- **State Machine**: Check [data-model.md](./data-model.md) state transition table
- **Testing**: Follow test cases in contract

**Still stuck?**:
- Check existing utilities in `src/utils/` for patterns
- Review how `formatters.js` is tested
- Look at `MessageText.jsx` current structure

---

## Success Criteria

You're done with P1 when:

- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ Manual testing shows no visible tags
- ✅ Performance <5ms for 10k chars
- ✅ Markdown still works
- ✅ No console errors/warnings
- ✅ Code reviewed and approved

**Estimated total time**: 4-6 hours for a focused implementation session.

Good luck! 🚀
