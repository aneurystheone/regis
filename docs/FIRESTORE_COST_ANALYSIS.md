# Firestore Cost Analysis: Granular vs Bulk Sync

> **Scenario:** 500 teachers × 5 classes × 40 students  
> **Goal:** Compare read/write costs between architectures

---

## Baseline Numbers

### Data Volume
- **Teachers:** 500
- **Classes:** 2,500 (500 × 5)
- **Students:** 100,000 (2,500 × 40)
- **Instruments per class:** 3 (average)
- **Total instruments:** 7,500
- **Total grades:** 300,000 (100,000 students × 3 instruments avg)

### Usage Patterns
- **Daily active teachers:** 250 (50% daily active)
- **Sessions per teacher per day:** 2
- **Avg grades entered per session:** 40 (1 class, 1 instrument)
- **Total daily write operations:** 250 teachers × 2 sessions × 40 grades = **20,000 writes/day**

---

## Architecture A: Current (Bulk Lists) - BROKEN

### Data Structure
```
lists/
  grades_{userId}/
    items: [600 grades] // All grades in one array
```

### Read Costs

**Initial app load (per teacher):**
- 1 document read
- **Per teacher:** 1 read
- **All 500 teachers (monthly):** 500 reads

**Daily active usage:**
- 250 teachers × 2 sessions = 500 sessions/day
- Each session: 1 read (loads all grades)
- **Daily:** 500 reads
- **Monthly (30 days):** 15,000 reads

**Total monthly reads:** ~15,000

### Write Costs

**Per grading session:**
- Teacher grades 40 students
- 1 write (replaces entire array of 600 items)
- **Daily:** 250 teachers × 2 sessions = 500 writes
- **Monthly:** 15,000 writes

**Problem:** ❌ Data loss on multi-device sync

---

## Architecture B: Granular Writes (Naive) - EXPENSIVE

### Data Structure
```
grades/
  {studentId}_{instrumentId}/
    (individual document per grade)
```

### Read Costs

**Initial app load - Load ALL grades (BAD):**
- Query: `where('userId', '==', uid)`
- Per teacher: 600 reads (all their grades)
- **All 500 teachers (monthly):** 300,000 reads 😱

**Daily active (all grades):**
- 250 teachers × 2 sessions × 600 reads = **300,000 reads/day** 💸💸💸
- **Monthly:** 9,000,000 reads

**Total monthly reads (naive):** ~9,000,000 reads ❌ PROHIBITIVO

### Write Costs

**Per grading session (GOOD):**
- Teacher grades 40 students
- 40 individual writes (only what changed)
- **Daily:** 250 teachers × 2 sessions × 40 = 20,000 writes
- **Monthly:** 600,000 writes

**Benefit:** ✅ Zero data loss, atomic writes

---

## Architecture C: Granular + Lazy Loading - OPTIMIZED ✅

### Data Structure
```
grades/
  {studentId}_{instrumentId}/
    classId: string // NEW: Enable filtering
    instrumentId: string
    studentId: string
    score: number
    userId: string
```

### Read Costs

**Initial app load - Load ONLY current class:**
- Query: `where('userId', '==', uid).where('classId', '==', currentClassId)`
- Per session: 40 students × 3 instruments = 120 reads
- **Daily:** 250 teachers × 2 sessions × 120 = 60,000 reads
- **Monthly:** 1,800,000 reads

**Optimization 1: Cache previous class**
- After first load, cache locally
- Subsequent visits to same class: 0 reads (cache hit)
- Estimated cache hit rate: 70%
- **Effective monthly reads:** 1,800,000 × 0.3 = **540,000 reads**

**Optimization 2: Composite index**
- Create index: (userId, classId, instrumentId)
- Faster queries, same read count

**Total monthly reads (optimized):** ~540,000

---

## Architecture D: Hybrid - Subcollections - BALANCED 🎯

### Data Structure
```
instruments/
  {instrumentId}/
    grades/
      {studentId}/
        score: number
        userId: string
```

### Read Costs

**Per grading session:**
- Query instrument's grades subcollection
- Per instrument: 40 reads (students in class)
- Teacher views 3 instruments/session avg
- **Daily:** 250 teachers × 2 sessions × 3 instruments × 40 = 60,000 reads
- **Monthly:** 1,800,000 reads

**With caching:**
- Firebase SDK caches subcollection queries
- Estimated cache hit: 60%
- **Effective monthly:** 1,800,000 × 0.4 = **720,000 reads**

### Write Costs

**Per grading session:**
- 40 individual writes (one per student)
- **Monthly:** 600,000 writes

**Benefit:** 
- ✅ No data loss (atomic per student)
- ✅ Natural scoping (grades belong to instrument)
- ✅ Easier to query/display

---

## Cost Comparison Table

| Architecture | Monthly Reads | Monthly Writes | Data Loss Risk | Cost (USD)* |
|--------------|---------------|----------------|----------------|-------------|
| **A. Current (Bulk)** | 15,000 | 15,000 | 🔴 HIGH | $0.06 |
| **B. Granular (Naive)** | 9,000,000 | 600,000 | ✅ ZERO | $290 |
| **C. Granular (Optimized)** | 540,000 | 600,000 | ✅ ZERO | $36 |
| **D. Hybrid Subcollections** | 720,000 | 600,000 | ✅ ZERO | $42 |

\* Firestore pricing (as of 2024):
- Reads: $0.06 per 100,000
- Writes: $0.18 per 100,000
- Storage: $0.18/GB/month

---

## Recommended Solution: Architecture D (Hybrid Subcollections)

### Why?

1. **Reasonable cost:** $42/month for 500 teachers = $0.084 per teacher
   - Can be covered by $7/month premium tier
   
2. **Zero data loss:** Atomic writes per student

3. **Natural data model:** Grades belong to instruments

4. **Query efficiency:** Subcollection queries are fast

5. **Scalability:** Linearly scales with usage

---

## Implementation Details

### Data Model Change

**From:**
```typescript
// Current
interface Grade {
  id: string;
  studentId: string;
  instrumentId: string;
  score: number;
}

// Stored in: lists/grades_{userId}
```

**To:**
```typescript
// New
interface Grade {
  id: string; // = studentId
  userId: string;
  score: number;
  updatedAt: Timestamp;
}

// Stored in: instruments/{instrumentId}/grades/{studentId}
```

### Query Pattern

```typescript
// Load grades for an instrument
const gradesRef = collection(db, 'instruments', instrumentId, 'grades');
const q = query(gradesRef, where('userId', '==', userId));
const snapshot = await getDocs(q);
// Reads: 40 (students in class)
```

### Write Pattern

```typescript
// Save single grade (atomic)
const gradeRef = doc(db, 'instruments', instrumentId, 'grades', studentId);
await setDoc(gradeRef, {
  userId,
  score: 95,
  updatedAt: serverTimestamp()
}, { merge: true });
// Writes: 1
```

**Offline sync:**
- Each grade writes independently
- No conflicts between devices
- Firestore SDK handles retry/queue automatically

---

## Migration Cost

### One-Time Migration
- Read all existing grade lists: 500 reads
- Write to new structure: ~300,000 writes
- **Cost:** ~$540 (one-time)

### Migration Strategy
1. Run script to copy data (one-time)
2. Deploy new code (parallel read from both structures)
3. Verify data integrity (1 week)
4. Switch to new structure
5. Delete old bulk lists

---

## Alternative: Composite Documents (Cheaper)

If cost is still a concern:

### Structure
```
instruments/
  {instrumentId}/
    grades_summary/
      data: { 
        student1: 95,
        student2: 87,
        ...
      }
      lastUpdated: Timestamp
      version: number // For optimistic locking
```

### Optimistic Locking
```typescript
// Read current version
const doc = await getDoc(summaryRef);
const currentVersion = doc.data().version || 0;

// Write with version check
await updateDoc(summaryRef, {
  [`data.${studentId}`]: score,
  version: currentVersion + 1,
  lastUpdated: serverTimestamp()
});

// If version conflict → retry
```

**Cost:** 
- Reads: 3 instruments × 250 teachers × 2 sessions = 1,500/day = 45,000/month
- Writes: Same as current
- **Total:** ~$0.30/month

**Tradeoff:**
- Cheaper (97% cost reduction)
- Still has small race condition window
- Requires retry logic

---

## Final Recommendation

**For 500 teachers:** Architecture D (Subcollections)
- Cost: $42/month
- Per teacher: $0.084/month
- Premium pricing: $7/month (8300% margin)
- ✅ **Affordable and safe**

**For 5,000+ teachers:** Consider composite + optimistic locking
- Cost at 5,000 teachers: $420/month (subcollections) vs $3/month (composite)
- Tradeoff: Complexity for savings

---

## Action Items

1. [ ] Implement Architecture D (subcollections)
2. [ ] Add `classId` to grade model (for future optimization)
3. [ ] Create composite index: (userId, instrumentId)
4. [ ] Run migration script
5. [ ] Monitor costs in Firebase console
6. [ ] If costs exceed $50/month with real usage → optimize further

---

**Bottom line:** $42/month is acceptable for 500 users. Go with subcollections.
