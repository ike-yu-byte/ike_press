# Machine & Deep Learning Foundations

> Stop 5: the foundation of AI. Application roles don't expect hand-derived backprop, but they do expect **correct model intuition**: train/validate/overfit, choosing metrics, why the Transformer rules today. The concepts here feed directly into the LLM chapter.

## 1. The machine-learning worldview

```
dataset ──split──→ train (learns parameters) / validation (tunes hyperparams, picks models) / test (touched ONCE, acceptance)
tasks ──two families──→ supervised (labeled: classification/regression) | unsupervised (unlabeled: clustering/dimensionality reduction)
failure ──two kinds──→ underfitting (model too simple even for train)
                       overfitting (memorizes: train 99%, test 70%) → fixes: more data / regularization / early stopping / simpler model / CV
```

- Feature engineering: numerics (imputation, scaling), categoricals (one-hot/target encoding), time (cyclic sin/cos, rolling stats) — on tabular data "good features beat fancy models" still holds.
- Metric selection (guaranteed exam material):

| Scenario | Metric | Caveat |
| --- | --- | --- |
| Balanced binary | Accuracy | meaningless under imbalance |
| Imbalanced (fraud/disease) | Precision / Recall / **F1** / AUC | ask the business: catch-all or catch-precise |
| Regression | MAE (robust) / RMSE (punishes big misses) / R² | never compare across units |
| Ranking/reco | Top-K hit rate, NDCG | app roles meet these too |

## 2. scikit-learn: classic ML end to end

```python
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.impute import SimpleImputer

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
#                                                  ↑ classification must stratify to keep class ratios

# Pipeline binds preprocessing to the model — prevents leakage (scaler fits on the training fold only)
pre = ColumnTransformer([
    ("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())]), num_cols),
    ("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")), ("oh", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
])
pipe = Pipeline([("pre", pre), ("clf", GradientBoostingClassifier())])

scores = cross_val_score(pipe, X_tr, y_tr, cv=5, scoring="roc_auc")     # 5-fold CV
print(f"AUC {scores.mean():.3f} ± {scores.std():.3f}")                  # report mean±std; single-fold lies

grid = GridSearchCV(pipe, {"clf__n_estimators": [200, 400], "clf__max_depth": [3, 5]},
                    scoring="roc_auc", n_jobs=-1, cv=5)                 # grid: lower LR, more trees
grid.best_estimator_.fit(X_tr, y_tr)                                    # tuning uses validation
pred = grid.best_estimator_.predict(X_te)
print(classification_report(y_te, pred))                                # the test set appears exactly here
```

Model cheat answers: logistic regression = interpretable baseline; random forest = robust and lazy; **GBDT families (XGBoost/LightGBM) = the tabular champion**; SVM for small data; KNN/clustering as literacy. Feature importance + SHAP explanations are what make business users trust the model.

## 3. Deep learning: intuition via PyTorch

```python
import torch
import torch.nn as nn

# a tensor: an n-d array with a device — NumPy lookalike that is differentiable and GPU-resident
x = torch.randn(64, 28 * 28, requires_grad=True)     # requires_grad: enters the autograd graph
model = nn.Sequential(                                # a network = composition of parameterized layers
    nn.Linear(28 * 28, 128), nn.ReLU(),                # fully connected + nonlinearity
    nn.Dropout(0.2),                                   # randomly drop units while training: anti-overfit
    nn.Linear(128, 10),
)
logits = model(x)                                      # forward: x → hidden → output

loss = nn.functional.cross_entropy(logits, y)          # loss: distance between prediction and truth
loss.backward()                                        # backward: autograd computes grads along the graph
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
optimizer.step(); optimizer.zero_grad()                # update params, then clear grads (forget it = accumulate — classic bug)

# the training-loop skeleton every AI project is a variant of
for epoch in range(10):
    model.train()                                   # train mode: Dropout/BN active
    for xb, yb in train_loader:                     # DataLoader: batching, shuffling, worker prefetch
        xb, yb = xb.to(device), yb.to(device)       # device = cuda/cpu — CPUs choke on big matrices
        optimizer.zero_grad()
        loss = nn.functional.cross_entropy(model(xb), yb)
        loss.backward(); optimizer.step()
    model.eval()                                    # eval mode: Dropout off, BN uses running stats
    with torch.no_grad():                           # inference skips grad bookkeeping — saves VRAM, prevents updates
        acc = evaluate(model, val_loader)
    if acc > best: torch.save(model.state_dict(), "best.pt")    # early stopping + checkpointing
```

Concepts you must own: **layers are parameterized functions, loss measures gap, backprop computes gradients, optimizers descend, batch/epoch/lr are the three knobs**. OOM → shrink batch first.

## 4. The Transformer: the engine of modern AI (conceptual)

- One-paragraph principle: text → tokens → vectors → **self-attention lets every token directly "look at" every other token, aggregating by relevance** → layers refine → output distribution over the next token.
- Why it won: attention breaks the RNN's sequential bottleneck — **parallel training + arbitrary-distance dependencies** — the two preconditions that made "scale everything" possible.
- Vocabulary (interview-frequent, used throughout the next chapter):

| Term | One-liner |
| --- | --- |
| Token / BPE | the model's atom; Chinese ≈ 1-2 chars/token; billing is per token |
| Context window | what it can "see" at once (128K common); beyond = truncation/amnesia |
| Embedding | tokens/sentences → high-dim vectors; semantic closeness = vector closeness — RAG's math |
| KV Cache | caching past keys/values to speed generation — the VRAM hog behind long-chat cost |
| Temperature / top_p | sampling knobs: 0 ≈ deterministic, high = creative and more hallucination |
| RLHF / DPO | preference-alignment training stages — "why models are polite yet opinionated" |

## 5. Five minutes in the Hugging Face ecosystem

```python
from transformers import pipeline

clf = pipeline("sentiment-analysis")                      # model auto-downloads: review sentiment
print(clf("This product is fantastic!"))                  # [{'label': 'POSITIVE', 'score': 0.999}]

gen = pipeline("text-generation", model="Qwen/Qwen2.5-0.5B-Instruct")
print(gen("Write a line of poetry about autumn", max_new_tokens=40))   # a generative model running locally
```

- HF Hub is to AI what PyPI is to Python: models/datasets/demos hosted; get familiar with `transformers`, `datasets`, `peft` (fine-tuning).
- Local small models (0.5B-7B): **Ollama** (`ollama run qwen2.5:7b`, ships an OpenAI-compatible API) — the free engine for the next chapter's RAG experiments.

## 6. How deep should an app engineer go?

| Tier | Content | Bar |
| --- | --- | --- |
| Required | ML worldview + sklearn end-to-end + can read a PyTorch training loop | a Kaggle intro-competition bronze on your own |
| Required | Transformer concepts + calling the transformers lib | explain self-attention "what/why" to an interviewer |
| Bonus | one LoRA fine-tune actually run | see the fine-tuning section next chapter |
| Algo roles only | hand-derived backprop, paper reproductions | app candidates: skip the self-torture |

## 7. Self-check

1. Why may the test set be touched only once? Validation vs test roles?
2. 1:99 imbalance, 98% accuracy — what does that prove? What should you look at?
3. What does cross-validation defend against? Why must the scaler live inside the Pipeline?
4. GBDT vs random forest philosophies (sequential error-correction vs parallel voting)?
5. What breaks without `optimizer.zero_grad()`? `model.eval()` vs `torch.no_grad()` — each doing what?
6. Which RNN problem does self-attention solve?
7. High vs low temperature — which tasks suit which?
8. What is the KV Cache and why are long conversations expensive?

Next stop → [LLM Application Development](./llm-dev): turning model capability into product capability.
