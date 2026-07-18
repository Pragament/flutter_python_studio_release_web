# Quick Reference

## Python Quick Reference

```python
name = "Alice"
age = 25
price = 19.99
is_valid = True
colors = ["red", "blue"]

if condition:
    pass
elif condition:
    pass
else:
    pass

for item in list:
    print(item)

while condition:
    pass
```

## AI and ML Flow

`Data -> Training -> Model -> Testing -> Evaluation -> Deployment`

## NLP Pipeline

`Raw Text -> Tokenization -> Stop Word Removal -> Stemming or Lemmatization -> Feature Extraction -> Analysis`

## Computer Vision Pipeline

`Image -> Pixels -> Feature Extraction -> Convolution -> CNN -> Classification`

## Evaluation Metrics

`Confusion Matrix -> Precision -> Recall -> F1 Score -> Accuracy`

## Summary Table

| Domain | Key Concepts |
| --- | --- |
| Python | `print()`, `input()`, variables, loops, conditionals, lists, tuples, libraries |
| AI and ML | Supervised, unsupervised, reinforcement, features, labels, training, testing |
| Deep Learning | ANNs, CNNs, layers, weights, activation functions, perceptron |
| NLP | Tokenization, stop words, stemming, lemmatization, Bag of Words, TF-IDF |
| Computer Vision | Pixels, RGB, grayscale, convolution, feature extraction |
| Statistics | Mean, median, mode, variance, distribution, outliers, sampling |
| Evaluation | Train-test split, confusion matrix, precision, recall, F1, accuracy |
| Ethics | Bias, transparency, accountability |

## Capstone Prerequisites

Use these notes when a capstone project mentions a prerequisite you are not sure about.

### `print`

`print()` displays information in the output console.

```python
print("Hello")
print("Area:", area)
```

### `input`

`input()` reads text typed by the user. Convert it when you need a number.

```python
name = input("Enter name: ")
age = int(input("Enter age: "))
price = float(input("Enter price: "))
```

### Arithmetic Operators

Arithmetic operators do math with numbers.

| Operator | Meaning | Example |
| --- | --- | --- |
| `+` | add | `a + b` |
| `-` | subtract | `a - b` |
| `*` | multiply | `a * b` |
| `/` | divide | `a / b` |
| `//` | integer division | `a // b` |
| `%` | remainder | `a % b` |
| `**` | power | `a ** 2` |

### Type Conversion

Type conversion changes a value from one type to another.

```python
count = int("12")
rate = float("5.5")
message = str(100)
```

### Comparison Operators

Comparison operators create `True` or `False` answers.

```python
age >= 18
marks == 100
price != 0
```

### `if-else`

Use `if-else` when there are two possible paths.

```python
if number % 2 == 0:
    print("Even")
else:
    print("Odd")
```

### `if-elif-else`

Use `elif` when there are more than two possible paths.

```python
if marks >= 90:
    print("Excellent")
elif marks >= 50:
    print("Pass")
else:
    print("Try again")
```

### Nested `if-else`

A nested `if` is an `if` statement inside another `if` or `else`.

```python
if age >= 18:
    if has_id:
        print("Allowed")
    else:
        print("Bring ID")
else:
    print("Too young")
```

### Modulo Operator

The modulo operator `%` gives the remainder after division. It is useful for even/odd and divisibility checks.

```python
number = 12
print(number % 5)  # 2

if number % 2 == 0:
    print("Even")
```

### `for` Loop

A `for` loop repeats code for each item in a sequence.

```python
for i in range(1, 6):
    print(i)
```

### `range()`

`range()` creates a sequence of numbers for loops.

```python
range(5)        # 0, 1, 2, 3, 4
range(1, 6)     # 1, 2, 3, 4, 5
range(2, 11, 2) # 2, 4, 6, 8, 10
```

### Accumulator

An accumulator is a variable that stores a running result while a loop runs.

```python
total = 0
for number in [3, 4, 5]:
    total = total + number
print(total)
```

### Accumulator Pattern

The accumulator pattern means:

1. Start with an initial value.
2. Update it inside a loop.
3. Use it after the loop.

```python
count = 0
for number in [2, 5, 8]:
    if number % 2 == 0:
        count = count + 1
print(count)
```

### `break`

`break` stops a loop early.

```python
for number in range(1, 10):
    if number == 5:
        break
    print(number)
```

### `math.sqrt`

`math.sqrt()` finds the square root of a number. Import `math` first.

```python
import math

root = math.sqrt(25)
print(root)  # 5.0
```
