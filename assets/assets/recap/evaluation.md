# Evaluation

## 1. Why Evaluate?

- Evaluation helps ensure AI models are accurate, reliable, and ready for deployment.

## 2. Train-Test Split

| Dataset | Purpose |
| --- | --- |
| Training Data | Model learns patterns |
| Testing Data | Model is evaluated |

- A train-test split helps prevent overfitting.

## 3. Accuracy Metrics

| Metric | Description |
| --- | --- |
| Accuracy | Percentage of correct predictions |
| Error | Difference between predicted and actual results |
| Absolute Error | Absolute difference between predicted and actual |
| Error Rate | Errors divided by total predictions |

## 4. Confusion Matrix

|  | Predicted Positive | Predicted Negative |
| --- | --- | --- |
| Actual Positive | True Positive | False Negative |
| Actual Negative | False Positive | True Negative |

## 5. Classification Metrics

| Metric | Formula | What It Measures |
| --- | --- | --- |
| Accuracy | `(TP + TN) / Total` | Overall correctness |
| Precision | `TP / (TP + FP)` | How many predicted positives are correct |
| Recall | `TP / (TP + FN)` | How well the model identifies actual positives |
| F1 Score | `2 * (P * R) / (P + R)` | Balance of precision and recall |

## 6. Ethical Concerns in AI

| Concern | Description |
| --- | --- |
| Bias | Unfair discrimination in AI decisions |
| Transparency | Understanding how decisions are made |
| Accountability | Responsibility for AI outcomes |
