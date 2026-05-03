import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const bfsVsDfsDiagram = String.raw`flowchart LR
    ROOT["1"] --> A["2"]
    ROOT --> B["3"]
    A --> C["4"]
    A --> D["5"]
    B --> E["6"]
    B --> F["7"]
    BFS["BFS: 1 → 2 → 3 → 4 → 5 → 6 → 7<br/>queue, shortest path"] --- ROOT
    DFS["DFS: 1 → 2 → 4 → 5 → 3 → 6 → 7<br/>stack or recursion"] --- ROOT`;

export const toc: TocItem[] = [
  { id: "big-o", title: "Big O Refresher", level: 2 },
  { id: "python-tools", title: "Python Interview Toolkit", level: 2 },
  { id: "arrays-strings", title: "Arrays and Strings", level: 2 },
  { id: "hashmaps-sets", title: "Hash Maps and Sets", level: 2 },
  { id: "stacks-queues", title: "Stacks and Queues", level: 2 },
  { id: "linked-lists", title: "Linked Lists", level: 2 },
  { id: "trees", title: "Trees", level: 2 },
  { id: "graphs", title: "Graphs and BFS/DFS", level: 2 },
  { id: "binary-search", title: "Binary Search", level: 2 },
  { id: "two-pointers", title: "Two Pointers", level: 2 },
  { id: "sliding-window", title: "Sliding Window", level: 2 },
  { id: "recursion", title: "Recursion", level: 2 },
  { id: "sorting", title: "Sorting", level: 2 },
  { id: "dynamic-programming", title: "Dynamic Programming Intro", level: 2 },
  { id: "exercises", title: "15 Coding Exercises", level: 2 },
];

export default function AlgorithmsAndDataStructuresPython() {
  return (
    <div className="article-content">
      <p>
        This module is your Python interview coding reference. Every pattern here appears
        in LeetCode-style interviews. The goal is not just knowing the algorithms but
        writing them in idiomatic, fast Python — using the right built-ins and avoiding
        the inefficiencies that cost you the job.
      </p>

      <h2 id="big-o">Big O Refresher</h2>

      <ArticleTable caption="This is the mental cheat sheet to keep in your head while writing Python interview solutions under time pressure." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Complexity</th>
              <th>Name</th>
              <th>Example</th>
              <th>10 → 100 elements</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>O(1)</strong></td>
              <td>Constant</td>
              <td><code>dict</code> lookup, <code>list.append()</code></td>
              <td>Fast regardless</td>
            </tr>
            <tr>
              <td><strong>O(log n)</strong></td>
              <td>Logarithmic</td>
              <td>Binary search, heap push/pop</td>
              <td>About 3x more work</td>
            </tr>
            <tr>
              <td><strong>O(n)</strong></td>
              <td>Linear</td>
              <td>Loop, linear scan</td>
              <td>10x more work</td>
            </tr>
            <tr>
              <td><strong>O(n log n)</strong></td>
              <td>Linearithmic</td>
              <td><code>sorted()</code>, merge sort</td>
              <td>About 33x more work</td>
            </tr>
            <tr>
              <td><strong>O(n²)</strong></td>
              <td>Quadratic</td>
              <td>Nested loops, bubble sort</td>
              <td>100x more work</td>
            </tr>
            <tr>
              <td><strong>O(2ⁿ)</strong></td>
              <td>Exponential</td>
              <td>Brute-force subsets / combinations</td>
              <td>Explodes completely</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre><code>{`# Python-specific complexity facts interviewers expect you to know:

# list
append()        O(1) amortized
pop()           O(1)  — from end
pop(0)          O(n)  — shifts all elements! Use deque.popleft() instead
insert(i, x)    O(n)
x in list       O(n)  — linear scan
list[i]         O(1)
len(list)       O(1)

# dict / set
d[key]          O(1) average
key in d        O(1) average
d[key] = v      O(1) average

# heapq
heappush        O(log n)
heappop         O(log n)
heapify         O(n)

# sorted() / sort()   O(n log n) — Timsort`}</code></pre>

      <h2 id="python-tools">Python Interview Toolkit</h2>

      <pre><code>{`from collections import Counter, defaultdict, deque
import heapq
import bisect

# ── Counter ────────────────────────────────────────────────
freq = Counter("mississippi")          # {'i':4,'s':4,'p':2,'m':1}
freq.most_common(2)                    # [('i',4),('s',4)]
freq["missing"]                        # 0 — no KeyError

# ── defaultdict ────────────────────────────────────────────
graph = defaultdict(list)              # adjacency list
graph[1].append(2)                     # no KeyError on first access

groups = defaultdict(list)
for item in items:
    groups[item.category].append(item)

# ── deque ──────────────────────────────────────────────────
q = deque()
q.append(x)                           # enqueue right
q.appendleft(x)                       # push left O(1)
q.popleft()                           # dequeue left O(1)  ← use for BFS!
q.pop()                               # pop right  O(1)

# ── heapq (min-heap) ───────────────────────────────────────
heap = []
heapq.heappush(heap, 3)
heapq.heappush(heap, 1)
heapq.heappush(heap, 2)
heapq.heappop(heap)                   # 1 — smallest always

# Max-heap trick: negate values
heapq.heappush(heap, -val)
-heapq.heappop(heap)                  # largest

# k largest elements
heapq.nlargest(k, nums)               # O(n log k)
heapq.nsmallest(k, nums)              # O(n log k)

heapq.heapify(nums)                   # convert list to heap in O(n)

# ── bisect (sorted list operations) ────────────────────────
import bisect
nums = [1, 3, 5, 7, 9]
bisect.bisect_left(nums, 5)           # 2 — leftmost insert position
bisect.bisect_right(nums, 5)          # 3 — rightmost insert position
bisect.insort(nums, 6)                # insert keeping sorted: [1,3,5,6,7,9]`}</code></pre>

      <h2 id="arrays-strings">Arrays and Strings</h2>

      <pre><code>{`# ── Common array patterns ──────────────────────────────────

# Reverse in place
nums[::-1]                            # new reversed list
nums.reverse()                        # in-place
nums = nums[::-1]                     # common in interviews

# Rotate array right by k
def rotate(nums, k):
    k %= len(nums)
    nums[:] = nums[-k:] + nums[:-k]   # [:] modifies in-place

# Check if two strings are anagrams
def is_anagram(s, t):
    return Counter(s) == Counter(t)
    # Or: return sorted(s) == sorted(t)  — O(n log n) but clean

# Find all indices of target
indices = [i for i, x in enumerate(nums) if x == target]

# ── String tricks ───────────────────────────────────────────

# Reverse a string
s[::-1]

# Check palindrome
s == s[::-1]
s.lower() == s.lower()[::-1]          # case-insensitive

# Most frequent character
Counter(s).most_common(1)[0]

# Group anagrams
from collections import defaultdict
def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        groups[tuple(sorted(w))].append(w)
    return list(groups.values())

# String to list of chars (for manipulation)
chars = list(s)
chars[i] = "x"
"".join(chars)`}</code></pre>

      <h2 id="hashmaps-sets">Hash Maps and Sets</h2>

      <pre><code>{`# Hash maps — the most useful structure in coding interviews

# Two Sum — classic
def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        complement = target - n
        if complement in seen:
            return [seen[complement], i]
        seen[n] = i
    return []

# Frequency map pattern
def first_unique(s):
    freq = Counter(s)
    for ch in s:
        if freq[ch] == 1:
            return ch
    return ""

# Set for O(1) lookup / deduplication
def longest_consecutive(nums):
    num_set = set(nums)
    best = 0
    for n in num_set:
        if n - 1 not in num_set:          # start of sequence
            length = 1
            while n + length in num_set:
                length += 1
            best = max(best, length)
    return best

# Index by key pattern (avoid O(n) lookups in loops)
user_by_id = {u["id"]: u for u in users}   # O(1) lookup instead of O(n)`}</code></pre>

      <h2 id="stacks-queues">Stacks and Queues</h2>

      <pre><code>{`# Stack — use a list (append/pop from end)
stack = []
stack.append(x)      # push — O(1)
stack.pop()          # pop  — O(1)
stack[-1]            # peek — O(1)

# Valid parentheses
def is_valid(s):
    stack = []
    pairs = {")": "(", "]": "[", "}": "{"}
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif not stack or stack[-1] != pairs[ch]:
            return False
        else:
            stack.pop()
    return not stack

# Monotonic stack — next greater element
def next_greater(nums):
    result = [-1] * len(nums)
    stack = []   # stores indices
    for i, n in enumerate(nums):
        while stack and nums[stack[-1]] < n:
            result[stack.pop()] = n
        stack.append(i)
    return result

# Queue — use deque for O(1) popleft
from collections import deque
queue = deque()
queue.append(x)      # enqueue
queue.popleft()      # dequeue — O(1)! (list.pop(0) is O(n))`}</code></pre>

      <h2 id="linked-lists">Linked Lists</h2>

      <pre><code>{`# Node definition
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# Build from list
def make_list(values):
    dummy = ListNode()
    curr = dummy
    for v in values:
        curr.next = ListNode(v)
        curr = curr.next
    return dummy.next

# Reverse a linked list
def reverse(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev

# Fast/slow pointer — detect cycle
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False

# Find middle node
def find_middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow

# Dummy head pattern (simplifies edge cases)
def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n + 1):
        fast = fast.next
    while fast:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next`}</code></pre>

      <h2 id="trees">Trees</h2>

      <pre><code>{`class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

# DFS — inorder (left → root → right)  → sorted order for BST
def inorder(root):
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

# Iterative inorder (avoids recursion limit)
def inorder_iter(root):
    result, stack, curr = [], [], root
    while curr or stack:
        while curr:
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()
        result.append(curr.val)
        curr = curr.right
    return result

# Max depth
def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))

# BFS — level order traversal
from collections import deque
def level_order(root):
    if not root:
        return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):   # process entire level
            node = queue.popleft()
            level.append(node.val)
            if node.left:  queue.append(node.left)
            if node.right: queue.append(node.right)
        result.append(level)
    return result

# Validate BST
def is_valid_bst(root, lo=float("-inf"), hi=float("inf")):
    if not root:
        return True
    if not (lo < root.val < hi):
        return False
    return (is_valid_bst(root.left, lo, root.val) and
            is_valid_bst(root.right, root.val, hi))`}</code></pre>

      <h2 id="graphs">Graphs and BFS/DFS</h2>

      <MermaidDiagram
        chart={bfsVsDfsDiagram}
        title="BFS vs DFS"
        caption="Use BFS for shortest-path or level-order problems. Use DFS for exhaustive exploration, recursion, backtracking, and many validation-style traversals."
        minHeight={420}
      />

      <pre><code>{`# Graph representations
graph = {                              # adjacency list — most common
    1: [2, 3],
    2: [4, 5],
    3: [6],
}

# BFS — shortest path, level order
from collections import deque

def bfs(graph, start):
    visited = set([start])
    queue = deque([start])
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return order

# BFS shortest path
def shortest_path(graph, start, end):
    queue = deque([(start, [start])])
    visited = {start}
    while queue:
        node, path = queue.popleft()
        if node == end:
            return path
        for nbr in graph.get(node, []):
            if nbr not in visited:
                visited.add(nbr)
                queue.append((nbr, path + [nbr]))
    return None

# DFS — recursive
def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    for neighbor in graph.get(node, []):
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
    return visited

# DFS — iterative (explicit stack)
def dfs_iter(graph, start):
    visited = set()
    stack = [start]
    while stack:
        node = stack.pop()
        if node not in visited:
            visited.add(node)
            stack.extend(graph.get(node, []))
    return visited

# Topological sort (DAG) — Kahn's algorithm
from collections import deque
def topo_sort(n, edges):
    graph = defaultdict(list)
    in_degree = [0] * n
    for u, v in edges:
        graph[u].append(v)
        in_degree[v] += 1
    queue = deque(i for i in range(n) if in_degree[i] == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nbr in graph[node]:
            in_degree[nbr] -= 1
            if in_degree[nbr] == 0:
                queue.append(nbr)
    return order if len(order) == n else []   # empty = cycle detected`}</code></pre>

      <h2 id="binary-search">Binary Search</h2>

      <pre><code>{`# Binary search — O(log n) on sorted array
def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2   # avoid overflow (same as (l+r)//2 in Python but good habit)
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# Find leftmost position (first occurrence / insert position)
def search_left(nums, target):
    left, right = 0, len(nums)
    while left < right:
        mid = (left + right) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid
    return left

# Search on answer — binary search the result space
def min_days_to_bloom(flowers, m, k):
    def can_bloom(days):
        blooms = bouquets = 0
        for f in flowers:
            if f <= days:
                blooms += 1
                if blooms == k:
                    bouquets += 1
                    blooms = 0
            else:
                blooms = 0
        return bouquets >= m

    left, right = min(flowers), max(flowers)
    while left < right:
        mid = (left + right) // 2
        if can_bloom(mid):
            right = mid
        else:
            left = mid + 1
    return left

# bisect module — use instead of writing binary search yourself
import bisect
nums = [1, 3, 5, 7, 9]
bisect.bisect_left(nums, 5)    # 2
bisect.bisect_right(nums, 5)   # 3`}</code></pre>

      <h2 id="two-pointers">Two Pointers</h2>

      <pre><code>{`# Two pointers — O(n) on sorted array, O(1) extra space

# Two sum on sorted array
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        elif s < target:
            left += 1
        else:
            right -= 1
    return []

# Remove duplicates in-place
def remove_duplicates(nums):
    if not nums:
        return 0
    slow = 0
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:
            slow += 1
            nums[slow] = nums[fast]
    return slow + 1

# Reverse a string in-place
def reverse_string(s):
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1

# Container with most water
def max_water(heights):
    left, right = 0, len(heights) - 1
    best = 0
    while left < right:
        water = (right - left) * min(heights[left], heights[right])
        best = max(best, water)
        if heights[left] < heights[right]:
            left += 1
        else:
            right -= 1
    return best`}</code></pre>

      <h2 id="sliding-window">Sliding Window</h2>

      <pre><code>{`# Fixed-size window
def max_sum_subarray(nums, k):
    window_sum = sum(nums[:k])
    best = window_sum
    for i in range(k, len(nums)):
        window_sum += nums[i] - nums[i - k]
        best = max(best, window_sum)
    return best

# Variable-size window — expand right, shrink left when invalid
def longest_substring_without_repeats(s):
    seen = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in seen and seen[ch] >= left:
            left = seen[ch] + 1
        seen[ch] = right
        best = max(best, right - left + 1)
    return best

# Minimum window containing all target chars
def min_window(s, t):
    need = Counter(t)
    missing = len(t)
    best = ""
    left = 0
    for right, ch in enumerate(s):
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1
        if missing == 0:
            while need[s[left]] < 0:
                need[s[left]] += 1
                left += 1
            window = s[left:right + 1]
            if not best or len(window) < len(best):
                best = window
            need[s[left]] += 1
            missing += 1
            left += 1
    return best`}</code></pre>

      <h2 id="recursion">Recursion</h2>

      <pre><code>{`# Recursion template:
# 1. Base case(s) — when to stop
# 2. Recursive case — reduce the problem

# Fibonacci with memoization
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

# Subsets (power set)
def subsets(nums):
    result = [[]]
    for n in nums:
        result += [s + [n] for s in result]
    return result

# Permutations
def permutations(nums):
    if len(nums) <= 1:
        return [nums]
    result = []
    for i, n in enumerate(nums):
        rest = nums[:i] + nums[i+1:]
        for p in permutations(rest):
            result.append([n] + p)
    return result

# Recursive backtracking template
def backtrack(state, choices, result):
    if is_complete(state):
        result.append(state[:])
        return
    for choice in choices:
        if is_valid(state, choice):
            state.append(choice)
            backtrack(state, choices, result)
            state.pop()           # undo — key to backtracking`}</code></pre>

      <h2 id="sorting">Sorting</h2>

      <pre><code>{`# Python's sort — Timsort, O(n log n), stable, in-place
nums.sort()                            # ascending
nums.sort(reverse=True)               # descending
sorted(nums)                          # new list
sorted(nums, key=abs)                 # by absolute value
sorted(words, key=str.lower)          # case-insensitive
sorted(people, key=lambda p: p["age"]) # by field
sorted(people, key=lambda p: (-p["age"], p["name"]))  # multi-key

# Custom sort for intervals
intervals.sort(key=lambda x: x[0])   # sort by start

# Merge intervals
def merge_intervals(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged

# Counting sort — O(n) when range is known
def counting_sort(nums, max_val):
    count = [0] * (max_val + 1)
    for n in nums:
        count[n] += 1
    return [n for n, c in enumerate(count) for _ in range(c)]`}</code></pre>

      <h2 id="dynamic-programming">Dynamic Programming Intro</h2>

      <pre><code>{`# DP = recursion + memoization (top-down) or tabulation (bottom-up)

# Classic: coin change — minimum coins to reach amount
def coin_change(coins, amount):
    dp = [float("inf")] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for coin in coins:
            if coin <= a:
                dp[a] = min(dp[a], dp[a - coin] + 1)
    return dp[amount] if dp[amount] != float("inf") else -1

# Longest common subsequence
def lcs(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]

# 0/1 Knapsack
def knapsack(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            dp[i][w] = dp[i-1][w]
            if weights[i-1] <= w:
                dp[i][w] = max(dp[i][w], dp[i-1][w - weights[i-1]] + values[i-1])
    return dp[n][capacity]`}</code></pre>

      <h2 id="exercises">15 Coding Exercises</h2>

      <h3>1. Two Sum</h3>
      <p>Given <code>nums</code> and <code>target</code>, return indices of two numbers that add to target.</p>
      <p><strong>Hint:</strong> hash map — complement lookup. <strong>Complexity:</strong> O(n) time, O(n) space.</p>

      <h3>2. Valid Parentheses</h3>
      <p>Given a string of brackets, return whether it is valid.</p>
      <p><strong>Hint:</strong> stack + dict mapping close→open. <strong>Complexity:</strong> O(n) time, O(n) space.</p>

      <h3>3. Longest Substring Without Repeating Characters</h3>
      <p>Return the length of the longest substring with no repeated characters.</p>
      <p><strong>Hint:</strong> sliding window + seen dict. <strong>Complexity:</strong> O(n) time, O(k) space (k = charset).</p>

      <h3>4. Maximum Subarray (Kadane's)</h3>
      <p>Find the contiguous subarray with the largest sum.</p>
      <p><strong>Hint:</strong> track <code>current</code> and <code>best</code>; reset current to 0 when negative. <strong>Complexity:</strong> O(n) time, O(1) space.</p>

      <h3>5. Binary Search</h3>
      <p>Implement binary search from scratch. Then find the leftmost insertion position for a target.</p>
      <p><strong>Hint:</strong> <code>left + (right - left) // 2</code>, <code>left &lt;= right</code>. <strong>Complexity:</strong> O(log n) time, O(1) space.</p>

      <h3>6. Reverse a Linked List</h3>
      <p>Reverse a singly linked list in-place, return new head.</p>
      <p><strong>Hint:</strong> <code>prev, curr = None, head</code>; three-pointer swap. <strong>Complexity:</strong> O(n) time, O(1) space.</p>

      <h3>7. Detect Cycle in Linked List</h3>
      <p>Return <code>True</code> if a linked list has a cycle.</p>
      <p><strong>Hint:</strong> fast/slow pointers meet if cycle. <strong>Complexity:</strong> O(n) time, O(1) space.</p>

      <h3>8. Level Order Tree Traversal</h3>
      <p>Return node values level by level (list of lists).</p>
      <p><strong>Hint:</strong> BFS with <code>deque</code>; track level size with <code>len(queue)</code> at start of each level. <strong>Complexity:</strong> O(n) time and space.</p>

      <h3>9. Number of Islands</h3>
      <p>Count islands in a 2D grid of <code>"1"</code> (land) and <code>"0"</code> (water).</p>
      <p><strong>Hint:</strong> DFS/BFS from each unvisited <code>"1"</code>, mark visited by setting to <code>"0"</code>. <strong>Complexity:</strong> O(m×n) time and space.</p>

      <h3>10. Merge Intervals</h3>
      <p>Given a list of intervals, merge all overlapping ones.</p>
      <p><strong>Hint:</strong> sort by start; compare each start to last merged end. <strong>Complexity:</strong> O(n log n) time, O(n) space.</p>

      <h3>11. Top K Frequent Elements</h3>
      <p>Return the k most frequent elements in a list.</p>
      <p><strong>Hint:</strong> <code>Counter.most_common(k)</code> or heap. <strong>Complexity:</strong> O(n log k) with heap.</p>

      <h3>12. Climbing Stairs</h3>
      <p>Count ways to reach step n taking 1 or 2 steps at a time.</p>
      <p><strong>Hint:</strong> DP — <code>dp[i] = dp[i-1] + dp[i-2]</code>, same as Fibonacci. <strong>Complexity:</strong> O(n) time, O(1) space.</p>

      <h3>13. Course Schedule (Topological Sort)</h3>
      <p>Given prerequisites, return <code>True</code> if all courses can be finished (no cycle).</p>
      <p><strong>Hint:</strong> build in-degree map; BFS with queue of zero-in-degree nodes. <strong>Complexity:</strong> O(V+E) time and space.</p>

      <h3>14. Coin Change</h3>
      <p>Return minimum coins needed to reach amount, or -1 if impossible.</p>
      <p><strong>Hint:</strong> DP bottom-up: <code>dp[a] = min(dp[a-coin]+1)</code> for each coin. <strong>Complexity:</strong> O(amount × coins) time and space.</p>

      <h3>15. Sliding Window Maximum</h3>
      <p>Given an array and window size k, return the max in each window.</p>
      <p><strong>Hint:</strong> monotonic deque — maintain indices of useful elements in decreasing order. <strong>Complexity:</strong> O(n) time, O(k) space.</p>
    </div>
  );
}
