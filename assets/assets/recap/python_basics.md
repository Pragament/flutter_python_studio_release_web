# Python Basics

## 1. What is Coding?

- Coding means writing instructions for machines to perform tasks.
- Algorithmic thinking means breaking problems into step-by-step solutions.

## 2. Python Overview

- Python is a simple, powerful programming language.
- Common uses: AI, web development, automation, and data science.
- Modes: interactive and script-based programming.

## 3. Basic Functions

```python
print("Hello")      # displays output
input("Enter: ")    # takes user input
```

## 4. Comments

```python
# Single-line comment
""" Multi-line comment """
```

## 5. Variables and Constants

| Type | Description | Example |
| --- | --- | --- |
| Variable | Value can change | `age = 25` |
| Constant | Fixed value, often uppercase | `PI = 3.14` |

## 6. Data Types and Typecasting

| Data Type | Example |
| --- | --- |
| `int` | `42` |
| `float` | `3.14` |
| `str` | `"Hello"` |
| `bool` | `True / False` |
| `list` | `[1, 2, 3]` |
| `tuple` | `(1, 2, 3)` immutable |

```python
int("123")      # string -> integer
float(5)        # integer -> float
str(123)        # integer -> string
```

## 7. Lists

```python
fruits = ["apple", "banana", "cherry"]

# Indexing: 0 = first, -1 = last
print(fruits[0])    # apple
print(fruits[-1])   # cherry

# Methods
fruits.append("orange")
fruits.remove("banana")
fruits.sort()
fruits.reverse()
```

## 8. Operators

| Type | Operators |
| --- | --- |
| Arithmetic | `+`, `-`, `*`, `/`, `%` |
| Assignment | `=`, `+=`, `-=`, `*=`, `/=` |
| Relational | `==`, `!=`, `<`, `>`, `<=`, `>=` |
| Logical | `and`, `or`, `not` |

## 9. Conditional Statements

```python
if age >= 18:
    print("Adult")

if age >= 18:
    print("Adult")
else:
    print("Minor")

if score >= 90:
    print("A")
elif score >= 80:
    print("B")
else:
    print("C")

if age >= 18:
    if has_license:
        print("Can drive")
```

## 10. Loops

```python
for fruit in fruits:
    print(fruit)

for i in range(5):
    print(i)

count = 0
while count < 5:
    print(count)
    count += 1
```

## 11. Python Libraries

| Library | Purpose |
| --- | --- |
| NumPy | Numerical operations and arrays |
| Pandas | Data handling and analysis |
| Matplotlib | Data visualization |
| OpenCV | Image processing |

## 12. Tools

- Jupyter Notebook is an interactive Python environment.
- Virtual environments isolate project dependencies.
