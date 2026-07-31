# AI Prompt Templates

## 1. Resolve this error

**Prompt:**
Help me identify the cause of this error and explain how to fix it.

---

## 2. Explain this error

**Prompt:**
What does this error message mean? Explain why it occurs and what I can do to resolve it.

---

## 3. Finish my code

**Prompt Template:**

````text
Help me complete the code I've started.

Task description:
<Describe what your program should do>

Current code:
```<paste your code here>```
````

---

## 4. Fix a bug

**Prompt Template:**

```text
Help me find and fix a bug in my program.

Expected output:
```

<Describe the expected result>
```

Actual output:

```
<Describe what actually happens>
```

Code:
`<paste your code here>`

````

---

## 5. Suggest another approach
**Prompt Template:**
```text
Show me alternative ways to solve this programming problem.

Problem description:
<Describe the task>

Current solution:
```<paste your code here>```
````

---

## 6. Explain code line by line

**Prompt Template:**

````text
Explain what this code does, one line at a time.

Code:
```<paste your code here>```
````

---

## 7. Add comments to code

**Prompt Template:**

````text
Add clear, helpful comments throughout this code explaining what each section does.

Code:
```<paste your code here>```
````

---

## 8. Summarize the code

**Prompt Template:**

````text
Provide a high-level explanation of what this program does, without describing every line individually.

Code:
```<paste your code here>```
````

---

## 9. Improve the code

**Prompt Template:**

````text
Review this code and suggest specific improvements for readability, performance, maintainability, and style.

Code:
```<paste your code here>```
````

---

## 10. Create test cases

**Prompt Template:**

````text
Generate a comprehensive set of test cases for this code, including normal inputs, edge cases, and invalid inputs where appropriate.

Code:
```<paste your code here>```
````

---

## 11. Teach the concept

**Prompt Template:**

````text
Teach me the main programming concept demonstrated by this code. Include a simple explanation and a small example if helpful.

Code:
```<paste your code here>```
````

---

## 12. Explain program execution

**Prompt Template:**

````text
Explain what the program is doing at this point during execution. Describe the current state of variables, control flow, and any important operations taking place.

Code:
```<paste your code here>```
````

---

## 13. Fix an infinite loop

**Prompt Template:**

````text
My program appears to be stuck in an infinite loop.

Help me identify the cause, explain why it happens, and suggest the smallest possible change to fix it.

Code:
```<paste your code here>```
````

---

# General AI Instructions

Use these instructions before every prompt:

```text
You are an experienced programming mentor helping a beginner programmer.

Guidelines:
- Keep explanations concise, clear, and beginner-friendly.
- Prefer responses under 300 words unless more detail is necessary.
- Preserve as much of the original code as possible when suggesting fixes.
- Make only the minimum required changes.
- Clearly comment any modifications you make.
- Any code you provide should be self-contained and runnable without external libraries unless the user requests otherwise.
- Format all responses using GitHub Flavored Markdown.
```
