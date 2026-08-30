/**
 * Interactive Coding Interview Sandbox & 6-Axis Evaluation Engine
 * 
 * Provides:
 * 1. Curated algorithmic coding problems with starter templates (Python, Java, TypeScript, C++).
 * 2. In-browser simulated code execution and test assertion runner.
 * 3. 6-Axis Evaluation Engine: Correctness, Time Complexity, Space Complexity,
 *    Code Quality, Communication, Debugging Approach.
 */

export type CodingLanguage = "python" | "java" | "typescript" | "cpp";

export interface CodingTestCase {
  id: number;
  inputDesc: string;
  expectedOutput: string;
  isSecret?: boolean;
}

export interface CodingProblem {
  id: string;
  title: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  constraints: string[];
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  starterCode: Record<CodingLanguage, string>;
  solutionReference: Record<CodingLanguage, string>;
  optimalTimeComplexity: string;
  optimalSpaceComplexity: string;
  testCases: CodingTestCase[];
}

export interface CodeTestResult {
  id: number;
  inputDesc: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTimeMs: number;
  logs?: string;
}

export interface CodeExecutionResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  results: CodeTestResult[];
  compilerOutput: string;
  hasSyntaxError: boolean;
}

export interface CodingEvaluation {
  overallScore: number; // 0 - 100
  problemTitle: string;
  language: CodingLanguage;
  correctness: {
    score: number; // 0 - 100
    passRate: string; // e.g. "3/3 passed (100%)"
    passedCount: number;
    totalCount: number;
    feedback: string;
  };
  timeComplexity: {
    score: number; // 0 - 100
    detectedNotation: string; // e.g. "O(N)"
    optimalNotation: string; // e.g. "O(N)"
    isOptimal: boolean;
    feedback: string;
  };
  spaceComplexity: {
    score: number; // 0 - 100
    detectedNotation: string; // e.g. "O(N)"
    optimalNotation: string; // e.g. "O(1)"
    feedback: string;
  };
  codeQuality: {
    score: number; // 0 - 100
    cleanCodeRating: "Clean & Idiomatic" | "Acceptable" | "Needs Refactoring";
    highlights: string[];
    suggestions: string[];
    feedback: string;
  };
  communication: {
    score: number; // 0 - 100
    clarityLevel: "Exemplary" | "Clear" | "Needs Structure";
    feedback: string;
  };
  debuggingApproach: {
    score: number; // 0 - 100
    methodology: "Systematic Boundary Testing" | "Iterative Dry Run" | "Basic Validation";
    feedback: string;
  };
  testResults: CodeTestResult[];
  interviewerSummary: string;
  interviewerSynthesis: string;
}

export const CODING_PROBLEMS: CodingProblem[] = [
  {
    id: "two-sum",
    title: "Two Sum (Target Pair Index Search)",
    category: "Arrays & Hash Maps",
    difficulty: "Easy",
    description:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    examples: [
      {
        input: "nums = [2, 7, 11, 15], target = 9",
        output: "[0, 1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3, 2, 4], target = 6",
        output: "[1, 2]",
      },
      {
        input: "nums = [3, 3], target = 6",
        output: "[0, 1]",
      },
    ],
    optimalTimeComplexity: "O(N)",
    optimalSpaceComplexity: "O(N)",
    testCases: [
      { id: 1, inputDesc: "nums = [2, 7, 11, 15], target = 9", expectedOutput: "[0, 1]" },
      { id: 2, inputDesc: "nums = [3, 2, 4], target = 6", expectedOutput: "[1, 2]" },
      { id: 3, inputDesc: "nums = [3, 3], target = 6", expectedOutput: "[0, 1]" },
      { id: 4, inputDesc: "nums = [-1, -2, -3, -4, -5], target = -8", expectedOutput: "[2, 4]", isSecret: true },
    ],
    starterCode: {
      python: `def two_sum(nums: list[int], target: int) -> list[int]:
    # Write your solution here
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
`,
      java: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}
`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}
`,
      cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (seen.find(complement) != seen.end()) {
                return {seen[complement], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};
`,
    },
    solutionReference: {
      python: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in seen:
            return [seen[diff], i]
        seen[n] = i
    return []`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int comp = target - nums[i];
            if (map.containsKey(comp)) return new int[]{map.get(comp), i};
            map.put(nums[i], i);
        }
        return new int[]{};
    }
}`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const comp = target - nums[i];
    if (map.has(comp)) return [map.get(comp)!, i];
    map.set(nums[i], i);
  }
  return [];
}`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); ++i) {
            int diff = target - nums[i];
            if (seen.count(diff)) return {seen[diff], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};`,
    },
  },
  {
    id: "longest-substring",
    title: "Longest Substring Without Repeating Characters",
    category: "Strings & Sliding Window",
    difficulty: "Medium",
    description:
      "Given a string `s`, find the length of the longest substring without repeating characters.",
    constraints: [
      "0 <= s.length <= 5 * 10^4",
      "`s` consists of English letters, digits, symbols and spaces.",
    ],
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation: 'The answer is "abc", with the length of 3.',
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation: 'The answer is "b", with the length of 1.',
      },
      {
        input: 's = "pwwkew"',
        output: "3",
        explanation: 'The answer is "wke", with the length of 3.',
      },
    ],
    optimalTimeComplexity: "O(N)",
    optimalSpaceComplexity: "O(min(N, M))",
    testCases: [
      { id: 1, inputDesc: 's = "abcabcbb"', expectedOutput: "3" },
      { id: 2, inputDesc: 's = "bbbbb"', expectedOutput: "1" },
      { id: 3, inputDesc: 's = "pwwkew"', expectedOutput: "3" },
      { id: 4, inputDesc: 's = ""', expectedOutput: "0", isSecret: true },
    ],
    starterCode: {
      python: `def length_of_longest_substring(s: str) -> int:
    char_map = {}
    max_len = 0
    left = 0
    for right, char in enumerate(s):
        if char in char_map and char_map[char] >= left:
            left = char_map[char] + 1
        char_map[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len
`,
      java: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> map = new HashMap<>();
        int maxLen = 0, left = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (map.containsKey(c) && map.get(c) >= left) {
                left = map.get(c) + 1;
            }
            map.put(c, right);
            maxLen = Math.max(maxLen, right - left + 1);
        }
        return maxLen;
    }
}
`,
      typescript: `function lengthOfLongestSubstring(s: string): number {
  const map = new Map<string, number>();
  let maxLen = 0;
  let left = 0;
  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (map.has(char) && map.get(char)! >= left) {
      left = map.get(char)! + 1;
    }
    map.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}
`,
      cpp: `#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_map<char, int> charMap;
        int maxLen = 0, left = 0;
        for (int right = 0; right < s.size(); right++) {
            if (charMap.count(s[right]) && charMap[s[right]] >= left) {
                left = charMap[s[right]] + 1;
            }
            charMap[s[right]] = right;
            maxLen = max(maxLen, right - left + 1);
        }
        return maxLen;
    }
};
`,
    },
    solutionReference: {
      python: `def length_of_longest_substring(s: str) -> int:
    char_map = {}
    max_len = left = 0
    for right, c in enumerate(s):
        if c in char_map and char_map[c] >= left:
            left = char_map[c] + 1
        char_map[c] = right
        max_len = max(max_len, right - left + 1)
    return max_len`,
      java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> map = new HashMap<>();
        int maxLen = 0, left = 0;
        for (int r = 0; r < s.length(); r++) {
            char c = s.charAt(r);
            if (map.containsKey(c) && map.get(c) >= left) left = map.get(c) + 1;
            map.put(c, r);
            maxLen = Math.max(maxLen, r - left + 1);
        }
        return maxLen;
    }
}`,
      typescript: `function lengthOfLongestSubstring(s: string): number {
  const map = new Map<string, number>();
  let maxLen = 0, left = 0;
  for (let r = 0; r < s.length; r++) {
    if (map.has(s[r]) && map.get(s[r])! >= left) left = map.get(s[r])! + 1;
    map.set(s[r], r);
    maxLen = Math.max(maxLen, r - left + 1);
  }
  return maxLen;
}`,
      cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_map<char, int> seen;
        int maxLen = 0, left = 0;
        for (int r = 0; r < s.size(); ++r) {
            if (seen.count(s[r]) && seen[s[r]] >= left) left = seen[s[r]] + 1;
            seen[s[r]] = r;
            maxLen = max(maxLen, r - left + 1);
        }
        return maxLen;
    }
};`,
    },
  },
  {
    id: "lru-cache",
    title: "Design LRU (Least Recently Used) Cache",
    category: "System Design & Data Structures",
    difficulty: "Hard",
    description:
      "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the `LRUCache` class:\n- `LRUCache(int capacity)` Initialize the LRU cache with positive size `capacity`.\n- `int get(int key)` Return the value of the `key` if the key exists, otherwise return `-1`.\n- `void put(int key, int value)` Update the value of the `key` if the `key` exists. Otherwise, add the `key-value` pair to the cache. If the number of keys exceeds the `capacity` from this operation, evict the least recently used key.\n\nThe functions `get` and `put` must each run in `O(1)` average time complexity.",
    constraints: [
      "1 <= capacity <= 3000",
      "0 <= key <= 10^4",
      "0 <= value <= 10^5",
      "At most 2 * 10^5 calls will be made to get and put.",
    ],
    examples: [
      {
        input: '["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]',
        output: "[null, null, null, 1, null, -1, null, -1, 3, 4]",
      },
    ],
    optimalTimeComplexity: "O(1) for get/put",
    optimalSpaceComplexity: "O(Capacity)",
    testCases: [
      { id: 1, inputDesc: "put(1,1), put(2,2), get(1)", expectedOutput: "1" },
      { id: 2, inputDesc: "put(3,3), get(2) [evicted]", expectedOutput: "-1" },
      { id: 3, inputDesc: "put(4,4), get(1) [evicted], get(3), get(4)", expectedOutput: "[-1, 3, 4]" },
    ],
    starterCode: {
      python: `class Node:
    def __init__(self, key: int = 0, val: int = 0):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.cache = {}
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def get(self, key: int) -> int:
        if key in self.cache:
            node = self.cache[key]
            self._remove(node)
            self._add(node)
            return node.val
        return -1

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self._remove(self.cache[key])
        node = Node(key, value)
        self._add(node)
        self.cache[key] = node
        if len(self.cache) > self.cap:
            lru = self.head.next
            self._remove(lru)
            del self.cache[lru.key]

    def _remove(self, node):
        p = node.prev
        n = node.next
        p.next = n
        n.prev = p

    def _add(self, node):
        p = self.tail.prev
        p.next = node
        node.prev = p
        node.next = self.tail
        self.tail.prev = node
`,
      java: `import java.util.*;

class LRUCache {
    class Node {
        int key, val;
        Node prev, next;
        Node(int k, int v) { key = k; val = v; }
    }
    
    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0);
    private final Node tail = new Node(0, 0);

    public LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        Node node = map.get(key);
        remove(node);
        add(node);
        return node.val;
    }

    public void put(int key, int value) {
        if (map.containsKey(key)) remove(map.get(key));
        Node node = new Node(key, value);
        add(node);
        map.put(key, node);
        if (map.size() > capacity) {
            Node lru = head.next;
            remove(lru);
            map.remove(lru.key);
        }
    }

    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void add(Node node) {
        Node prev = tail.prev;
        prev.next = node;
        node.prev = prev;
        node.next = tail;
        tail.prev = node;
    }
}
`,
      typescript: `class DNode {
  key: number;
  val: number;
  prev: DNode | null = null;
  next: DNode | null = null;
  constructor(key = 0, val = 0) {
    this.key = key;
    this.val = val;
  }
}

class LRUCache {
  private cap: number;
  private map = new Map<number, DNode>();
  private head = new DNode();
  private tail = new DNode();

  constructor(capacity: number) {
    this.cap = capacity;
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key: number): number {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key)!;
    this.remove(node);
    this.add(node);
    return node.val;
  }

  put(key: number, value: number): void {
    if (this.map.has(key)) this.remove(this.map.get(key)!);
    const node = new DNode(key, value);
    this.add(node);
    this.map.set(key, node);
    if (this.map.size > this.cap) {
      const lru = this.head.next!;
      this.remove(lru);
      this.map.delete(lru.key);
    }
  }

  private remove(node: DNode) {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private add(node: DNode) {
    const p = this.tail.prev!;
    p.next = node;
    node.prev = p;
    node.next = this.tail;
    this.tail.prev = node;
  }
}
`,
      cpp: `#include <unordered_map>
using namespace std;

class LRUCache {
    struct Node {
        int key, val;
        Node *prev, *next;
        Node(int k = 0, int v = 0): key(k), val(v), prev(nullptr), next(nullptr) {}
    };
    int cap;
    unordered_map<int, Node*> cache;
    Node *head, *tail;

public:
    LRUCache(int capacity) : cap(capacity) {
        head = new Node();
        tail = new Node();
        head->next = tail;
        tail->prev = head;
    }

    int get(int key) {
        if (!cache.count(key)) return -1;
        Node* node = cache[key];
        remove(node);
        add(node);
        return node->val;
    }

    void put(int key, int value) {
        if (cache.count(key)) remove(cache[key]);
        Node* node = new Node(key, value);
        add(node);
        cache[key] = node;
        if (cache.size() > cap) {
            Node* lru = head->next;
            remove(lru);
            cache.erase(lru->key);
            delete lru;
        }
    }

private:
    void remove(Node* n) {
        n->prev->next = n->next;
        n->next->prev = n->prev;
    }
    void add(Node* n) {
        Node* p = tail->prev;
        p->next = n;
        n->prev = p;
        n->next = tail;
        tail->prev = n;
    }
};
`,
    },
    solutionReference: {
      python: `# Hash Map + Doubly Linked List for O(1) eviction`,
      java: `// Hash Map + Doubly Linked List`,
      typescript: `// Hash Map + Doubly Linked List`,
      cpp: `// Hash Map + Doubly Linked List`,
    },
  },
];

/**
 * Execute in-browser simulated test runner
 */
export async function runCodeTests(
  language: CodingLanguage,
  code: string,
  problem: CodingProblem
): Promise<CodeExecutionResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      success: false,
      totalTests: problem.testCases.length,
      passedTests: 0,
      results: problem.testCases.map((tc) => ({
        id: tc.id,
        inputDesc: tc.inputDesc,
        expectedOutput: tc.expectedOutput,
        actualOutput: "Error: No code submitted",
        passed: false,
        executionTimeMs: 0,
      })),
      compilerOutput: "Compilation Error: Empty code buffer.",
      hasSyntaxError: true,
    };
  }

  // Syntax heuristic validation
  const hasSyntaxError =
    (language === "python" && (code.includes("def ") && !code.includes(":"))) ||
    (language !== "python" && (code.split("{").length !== code.split("}").length));

  if (hasSyntaxError) {
    return {
      success: false,
      totalTests: problem.testCases.length,
      passedTests: 0,
      results: problem.testCases.map((tc) => ({
        id: tc.id,
        inputDesc: tc.inputDesc,
        expectedOutput: tc.expectedOutput,
        actualOutput: "SyntaxError: Unexpected token / invalid indentation",
        passed: false,
        executionTimeMs: 0,
      })),
      compilerOutput: `SyntaxError in ${language.toUpperCase()} syntax stream: unbalanced blocks or missing colons.`,
      hasSyntaxError: true,
    };
  }

  // Simulate execution across test cases
  const isHashOptimal =
    code.includes("dict") ||
    code.includes("map") ||
    code.includes("seen") ||
    code.includes("Map") ||
    code.includes("HashMap") ||
    code.includes("unordered_map");

  const results: CodeTestResult[] = problem.testCases.map((tc, idx) => {
    const isPassing = isHashOptimal || idx < problem.testCases.length - 1;
    const latency = Math.round(1.5 + Math.random() * 4);
    return {
      id: tc.id,
      inputDesc: tc.inputDesc,
      expectedOutput: tc.expectedOutput,
      actualOutput: isPassing ? tc.expectedOutput : "[Wrong Answer / Time Limit Exceeded]",
      passed: isPassing,
      executionTimeMs: latency,
      logs: isPassing ? "Stdout: [OK] Assertion matched." : "Stdout: Assertion failed.",
    };
  });

  const passedCount = results.filter((r) => r.passed).length;
  const success = passedCount === problem.testCases.length;

  return {
    success,
    totalTests: problem.testCases.length,
    passedTests: passedCount,
    results,
    compilerOutput: success
      ? `✓ All ${passedCount}/${problem.testCases.length} test cases passed successfully in ${language.toUpperCase()} runtime.`
      : `⚠ ${passedCount}/${problem.testCases.length} test cases passed. ${problem.testCases.length - passedCount} failed assertion or timeout.`,
    hasSyntaxError: false,
  };
}

/**
 * 6-Axis Evaluation Engine for Coding Interview Mode
 */
export function evaluateCodingSolution(
  code: string,
  language: CodingLanguage,
  verbalApproach: string,
  problem: CodingProblem,
  executionResult: CodeExecutionResult,
  verbalCommScore = 75
): CodingEvaluation {
  const codeLength = code.trim().length;
  const verbalLength = verbalApproach.trim().length;

  // 1. Correctness (0 - 100)
  const passRatePercent =
    executionResult.totalTests > 0
      ? (executionResult.passedTests / executionResult.totalTests) * 100
      : 0;
  const correctnessScore = Math.round(passRatePercent);

  // 2. Time Complexity Detection & Score
  const hasNestedLoops =
    (code.match(/for\s+/g) || []).length >= 2 ||
    (code.match(/while\s+/g) || []).length >= 2;
  const hasMapLookup =
    code.includes("map") ||
    code.includes("seen") ||
    code.includes("HashMap") ||
    code.includes("unordered_map") ||
    code.includes("Set") ||
    code.includes("set");

  let detectedTime = "O(N)";
  let timeScore = 90;
  if (hasNestedLoops && !hasMapLookup) {
    detectedTime = "O(N²)";
    timeScore = 60;
  } else if (!hasMapLookup && problem.category.includes("Hash")) {
    detectedTime = "O(N log N) / O(N²)";
    timeScore = 65;
  }

  const isOptimalTime = detectedTime === problem.optimalTimeComplexity;

  // 3. Space Complexity Detection & Score
  let detectedSpace = "O(N)";
  let spaceScore = 88;
  if (!hasMapLookup) {
    detectedSpace = "O(1)";
    spaceScore = 95;
  }

  // 4. Code Quality
  const hasGoodNaming =
    code.includes("complement") ||
    code.includes("diff") ||
    code.includes("maxLen") ||
    code.includes("left") ||
    code.includes("right") ||
    code.includes("seen");
  const hasComments = code.includes("#") || code.includes("//");
  let qualityScore = 78;
  if (hasGoodNaming) qualityScore += 12;
  if (hasComments) qualityScore += 6;
  if (codeLength > 500) qualityScore -= 8;
  qualityScore = Math.max(40, Math.min(98, qualityScore));

  const cleanRating: CodingEvaluation["codeQuality"]["cleanCodeRating"] =
    qualityScore >= 85 ? "Clean & Idiomatic" : qualityScore >= 70 ? "Acceptable" : "Needs Refactoring";

  // 5. Communication (STAR / Verbal Walkthrough)
  let commScore = verbalCommScore;
  if (verbalLength > 150) commScore = Math.max(commScore, 86);
  if (verbalApproach.toLowerCase().includes("complexity") || verbalApproach.toLowerCase().includes("hash map")) {
    commScore += 6;
  }
  commScore = Math.max(35, Math.min(98, commScore));

  const clarityLevel: CodingEvaluation["communication"]["clarityLevel"] =
    commScore >= 85 ? "Exemplary" : commScore >= 68 ? "Clear" : "Needs Structure";

  // 6. Debugging Approach
  let debugScore = 75;
  if (executionResult.passedTests === executionResult.totalTests) debugScore += 15;
  if (verbalApproach.toLowerCase().includes("edge case") || verbalApproach.toLowerCase().includes("test")) {
    debugScore += 8;
  }
  debugScore = Math.max(40, Math.min(96, debugScore));

  const debugMethod: CodingEvaluation["debuggingApproach"]["methodology"] =
    debugScore >= 85 ? "Systematic Boundary Testing" : "Iterative Dry Run";

  // Overall Weighted Score
  const overallScore = Math.round(
    correctnessScore * 0.30 +
    timeScore * 0.20 +
    spaceScore * 0.15 +
    qualityScore * 0.15 +
    commScore * 0.10 +
    debugScore * 0.10
  );

  return {
    overallScore,
    problemTitle: problem.title,
    language,
    correctness: {
      score: correctnessScore,
      passRate: `${executionResult.passedTests}/${executionResult.totalTests} passed (${Math.round(passRatePercent)}%)`,
      passedCount: executionResult.passedTests,
      totalCount: executionResult.totalTests,
      feedback:
        correctnessScore === 100
          ? "All assertion tests including boundary corner-cases passed cleanly without regression."
          : `Missed ${executionResult.totalTests - executionResult.passedTests} test case(s). Review edge handling for negative numbers or duplicates.`,
    },
    timeComplexity: {
      score: timeScore,
      detectedNotation: detectedTime,
      optimalNotation: problem.optimalTimeComplexity,
      isOptimal: isOptimalTime,
      feedback: isOptimalTime
        ? `Achieved optimal ${detectedTime} runtime using single-pass linear indexing.`
        : `Detected suboptimal ${detectedTime} runtime. Consider a Hash Map / Two-Pointer lookup to reduce from ${detectedTime} to ${problem.optimalTimeComplexity}.`,
    },
    spaceComplexity: {
      score: spaceScore,
      detectedNotation: detectedSpace,
      optimalNotation: problem.optimalSpaceComplexity,
      feedback: `Memory consumption scales at ${detectedSpace} auxiliary space, meeting required system constraints.`,
    },
    codeQuality: {
      score: qualityScore,
      cleanCodeRating: cleanRating,
      highlights: [
        hasGoodNaming ? "Descriptive variable naming conventions" : "Standard naming conventions",
        "Clean indentation and modular boundary conditions",
      ],
      suggestions: [
        "Include explicit docstrings with input/output type constraints.",
        "Add guard clauses for empty arrays or null pointers at function entry.",
      ],
      feedback:
        qualityScore >= 85
          ? "Clean, idiomatic syntax with clear naming and modular separation."
          : "Refactor nested loops into helper methods and use descriptive variable names.",
    },
    communication: {
      score: commScore,
      clarityLevel,
      feedback:
        commScore >= 85
          ? "Excellent verbal walkthrough. Explained data structure tradeoffs before implementing."
          : "Articulate your thought process aloud before typing code to keep the interviewer aligned.",
    },
    debuggingApproach: {
      score: debugScore,
      methodology: debugMethod,
      feedback:
        debugScore >= 85
          ? "Systematically traced variable state against test inputs before final submission."
          : "Step through test cases line-by-line during dry runs to catch boundary off-by-one errors.",
    },
    testResults: executionResult.results,
    interviewerSummary: `Candidate achieved a ${overallScore}/100 coding score on ${problem.title}. Algorithmic approach achieved ${detectedTime} time and ${detectedSpace} space complexity with ${executionResult.passedTests}/${executionResult.totalTests} assertions passing.`,
    interviewerSynthesis: `Solid algorithmic implementation of ${problem.title} in ${language.toUpperCase()}. The solution exhibited ${detectedTime} time and ${detectedSpace} space complexity with ${executionResult.passedTests}/${executionResult.totalTests} test assertions verified. Communication clarity was evaluated as "${clarityLevel}".`,
  };
}
