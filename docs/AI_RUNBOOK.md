# AI INTEGRATION RUNBOOK
**Operational Guide for Gemini 1.5 Pro in DOCNEX AI**

---

## Quick Reference

### Environment Variables Required
```bash
# .env.local
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-pro-latest  # Optional, defaults to this
GEMINI_TIMEOUT=30000  # Optional, in milliseconds
```

### Test Commands
```bash
# Test Gemini connection
npm run test:gemini
# or
tsx scripts/test-gemini-connection.ts

# Test edge cases & security
tsx scripts/test-edge-cases.ts
```

---

## Common Issues & Solutions

### 1. "API Key Not Found" Error

**Symptoms:**
```
Error: GEMINI_API_KEY not found in environment variables
```

**Solution:**
1. Check `.env.local` exists in project root
2. Verify the key is named `GOOGLE_GENERATIVE_AI_API_KEY`
3. Restart dev server: `npm run dev`
4. Check key validity at: https://aistudio.google.com/apikey

**Prevention:** Always test connection with `test-gemini-connection.ts` first

---

### 2. Rate Limit Exceeded

**Symptoms:**
```
Error: 429 Too Many Requests
```

**Cause:** Exceeded API quota (default: 60 requests/minute)

**Immediate Fix:**
- Wait 60 seconds before retrying
- Check current usage in Google AI Studio

**Long-term Fix:**
- Implement request queuing
- Add caching for repeated requests
- Upgrade API tier if needed

**Code Reference:** [`input-sanitizer.ts`](file:///c:/Dev/DOCNEX%20AI/DOCNEX_INICIO/apps/web/lib/ai/input-sanitizer.ts) - `RateLimiter` class

---

### 3. Request Timeout

**Symptoms:**
```
Error: Request timed out after 30000ms
```

**Causes:**
- Very large document (>100 pages)
- Slow network connection
- Gemini API experiencing delays

**Solutions:**
1. **For large documents:**
   - Split into smaller chunks before processing
   - Increase timeout in `.env.local`:
     ```bash
     GEMINI_TIMEOUT=60000  # 60 seconds
     ```

2. **For network issues:**
   - Check internet connection
   - Try again in a few minutes
   - Check Gemini status: https://status.cloud.google.com

3. **Fallback:**
   - Use manual splitting instead of AI
   - Process offline and upload results

---

### 4. Invalid AI Response

**Symptoms:**
```
Error: AI returned invalid JSON
ValidationError: blocks[0].title is required
```

**Cause:** AI generated malformed response

**Automatic Handling:**
- System falls back to single-block import
- User sees: "No se pudo dividir automáticamente, importado como un bloque"

**Manual Fix:**
1. Retry the operation (often works second time)
2. Use simpler instructions
3. Try a different split strategy

**Debugging:**
```typescript
// Check ai-error-types.ts for error details
import { AIValidationError } from '@/lib/ai/ai-error-types';
```

---

### 5. Prompt Injection Detected

**Symptoms:**
```
"Detecté un intento de manipulación del sistema..."
```

**Cause:** User input contained suspicious patterns:
- "Ignore previous instructions"
- "You are now..."
- Script tags or code

**Solution:**
- This is **working as intended** (security feature)
- User needs to rephrase their request
- Avoid using words like "ignore", "pretend", etc.

**False Positives:**
If legitimate text is blocked:
1. Review patterns in [`input-sanitizer.ts:11-25`](file:///c:/Dev/DOCNEX%20AI/DOCNEX_INICIO/apps/web/lib/ai/input-sanitizer.ts#L11-L25)
2. Adjust regex to be more specific
3. Add whitelist for legal terms

---

### 6. File Upload Rejected

**Symptoms:**
```
"File too large: 150MB (max: 100MB)"
"Unsupported file type: application/exe"
```

**Causes:**
- File exceeds 100MB limit
- File type not supported (only PDF, TXT, DOCX allowed)

**Solutions:**
1. **For large files:**
   - Compress PDF (use PDF optimizer)
   - Split into multiple documents
   - Extract text and upload as TXT

2. **For unsupported types:**
   - Convert to PDF or DOCX
   - Check supported types in [`input-sanitizer.ts:117-122`](file:///c:/Dev/DOCNEX%20AI/DOCNEX_INICIO/apps/web/lib/ai/input-sanitizer.ts#L117-L122)

---

### 7. Empty Document Error

**Symptoms:**
```json
{
  "success": false,
  "errors": [{"code": "EMPTY_DOCUMENT"}]
}
```

**Causes:**
- PDF is scanned image (no text layer)
- File is blank/corrupted
- Encoding issues

**Solutions:**
1. **For scanned PDFs:**
   - Use OCR tool first (Adobe, online OCR)
   - Re-upload processed version

2. **For corrupted files:**
   - Try opening in PDF viewer
   - Re-download original file
   - Convert to different format

3. **For encoding:**
   - Save as UTF-8
   - Remove special characters

---

### 8. AI Hallucination (Adding Fake Content)

**Symptoms:**
- AI creates titles/content not in original document
- Metadata doesn't match source

**Detection:**
```typescript
// System prompts include anti-hallucination rules
// See: system-prompts.ts - "Do NOT hallucinate"
```

**Prevention:**
- Always validate AI output against source
- Use stricter prompts
- Cross-check important documents manually

**If Detected:**
1. Report to dev team (include prompt + response)
2. Use manual splitting for critical documents
3. Compare output with source carefully

---

## Monitoring Checklist

### Daily Checks
- [ ] API quota usage < 80%
- [ ] Error rate < 5%
- [ ] Average response time < 10s

### Weekly Checks
- [ ] Review error logs
- [ ] Check cost trends
- [ ] Update blocklist patterns if needed

### Monthly Checks
- [ ] Audit API keys security
- [ ] Review hallucination reports
- [ ] Update test cases

---

## Performance Benchmarks

### Expected Response Times
| Operation | Expected | Max Acceptable |
|-----------|----------|----------------|
| Chat | 1-3s | 10s |
| Simple split (< 10 pages) | 3-5s | 15s |
| Complex split (50+ pages) | 10-20s | 60s |
| Text analysis | 2-4s | 10s |

### Cost Estimates (Gemini 1.5 Pro)
- Chat message: ~$0.001
- Document split (20 pages): ~$0.01
- Large doc (100 pages): ~$0.05

**Monthly estimate for 1000 users:** ~$50-200

---

## Emergency Contacts

### If Gemini is Down
1. Check status: https://status.cloud.google.com
2. Enable fallback mode (manual splitting only)
3. Notify users via app banner

### If Costs Spike
1. Check API dashboard for unusual activity
2. Review rate limiting settings
3. Temporarily disable AI features if needed

### If Security Breach Suspected
1. Rotate API keys immediately
2. Review recent logs
3. Check for prompt injection patterns in logs

---

## Escalation Path

### Level 1: User Issue
→ Check this runbook  
→ Test with `test-gemini-connection.ts`  
→ Review error logs

### Level 2: Code Issue
→ Check [`AI_QA_REPORT.md`](file:///c:/Dev/DOCNEX%20AI/DOCNEX_INICIO/docs/AI_QA_REPORT.md)  
→ Review validation schemas  
→ Run full test suite

### Level 3: API Issue
→ Contact Google Cloud support  
→ Check API quotas/billing  
→ Review API terms of service

---

**Last Updated:** 2026-01-10  
**Maintained by:** THE SKEPTIC 🔍
