# 机器学习与深度学习入门

> 第 5 站：AI 的地基。应用岗不要求手推反向传播公式，但要求**建立正确的模型心智**：什么是训练/验证/过拟合、评估指标怎么选、Transformer 为什么是今天的一切。这一站的概念直通下一站大模型应用。
>
> **阅读方式**：每个 Python 知识点后都紧跟 **JS 对照（TensorFlow.js / Hugging Face JS）**。概念是通用的，只是工具链不同。

## 一、机器学习的世界观

```text
数据集 ──切分──→ 训练集(学参数) / 验证集(调超参、选模型) / 测试集(只碰一次，验收)
任务 ──分两类──→ 监督学习（有标签：分类/回归） | 无监督（无标签：聚类/降维）
失败 ──两种──→ 欠拟合（模型太简单，训练集都学不好）
              过拟合（背题，训练 99% 测试 70%）→ 解法：更多数据/正则化/早停/简化模型/交叉验证
```

**JS 对照：** 这套世界观与语言无关。TensorFlow.js 里同样是 `model.fit(trainX, trainY, { validationSplit: 0.2, epochs, callbacks })`——训练集/验证集切分、`epochs`、`callbacks` 里的 early stopping 都是同一套概念，只是 API 名字不同。

- 特征工程：数值（缺失填充、标准化）、类别（one-hot/目标编码）、时间（周期 sin/cos、滑动统计）——表格数据上"好特征 > 复杂模型"至今成立。JS 侧用 Danfo.js / 手写管道做同样的事。
- 评估指标选型（面试必考）：

| 场景 | 指标 | 注意 |
| --- | --- | --- |
| 二分类均衡 | 准确率 Accuracy | 类别不平衡时毫无意义 |
| 不平衡（欺诈/患病） | Precision / Recall / **F1** / AUC | 先问业务要"抓全"还是"抓准" |
| 回归 | MAE（抗离群）/ RMSE（罚大错）/ R² | 量纲不同别混比 |
| 排序/推荐 | Top-K 命中率、NDCG | 应用岗也会碰到 |

## 二、scikit-learn：经典 ML 一条龙

<CodeCompare>

<template #python>

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
#                                                  ↑ 分类任务必 stratify 保持正负比例

# Pipeline：预处理和模型绑在一起——防数据泄漏（scaler 只能在训练折上 fit）
pre = ColumnTransformer([
    ("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())]), num_cols),
    ("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")), ("oh", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
])
pipe = Pipeline([("pre", pre), ("clf", GradientBoostingClassifier())])

scores = cross_val_score(pipe, X_tr, y_tr, cv=5, scoring="roc_auc")
# 5 折交叉验证
print(f"AUC {scores.mean():.3f} ± {scores.std():.3f}")
# 报均值±方差，单折分数不可信

grid = GridSearchCV(pipe, {"clf__n_estimators": [200, 400], "clf__max_depth": [3, 5]},
                    scoring="roc_auc", n_jobs=-1, cv=5)
                    # 参数网格：学习率小、树多
grid.best_estimator_.fit(X_tr, y_tr)
# 调参用验证集
pred = grid.best_estimator_.predict(X_te)
print(classification_report(y_te, pred))
# 测试集只在此刻出场
```

</template>

<template #js>

```js
// TF.js 有模型与训练，但没有 sklearn 那种开箱即用的 Pipeline/GridSearchCV
import * as tf from "@tensorflow/tfjs";

const model = tf.sequential({
  layers: [tf.layers.dense({ inputShape: [features], units: 16, activation: "relu" }),
           tf.layers.dense({ units: 1, activation: "sigmoid" })],
});
model.compile({ optimizer: tf.train.adam(0.001), loss: "binaryCrossentropy", metrics: ["accuracy"] });

await model.fit(trainX, trainY, {
  epochs: 50,
  batchSize: 32,
  validationSplit: 0.2,
  // ≈ train_test_split + 验证集
  callbacks: tf.callbacks.earlyStopping({ monitor: "val_loss", patience: 5 }),
  // ≈ 早停
});

const pred = model.predict(testX);
// 分类指标要自己算，或引入 ml-matrics / 手写混淆矩阵
```

</template>

</CodeCompare>

> **现实差异**：表格数据 ML（GBDT/XGBoost）在 JS 生态远不如 Python 成熟。前端同学学这部分主要为了**读懂 Python 代码和评估指标**，真做表格 ML 仍建议 Python。

模型选择速答：逻辑回归=可解释基线；随机森林=抗过拟合省心；**GBDT 系（XGBoost/LightGBM）=表格数据冠军常客**；SVM 小样本；KNN/聚类做熟悉概念即可。特征重要性 + SHAP 解释输出，业务方才敢用。

## 三、深度学习：从 PyTorch 建立直觉

<CodeCompare>

<template #python>

```python
import torch
import torch.nn as nn

# 张量：带 GPU 位置的多维数组——和 NumPy 长得像，区别是可求导、可上 GPU
x = torch.randn(64, 28 * 28, requires_grad=True)
# requires_grad：进入自动求导图
model = nn.Sequential(
# 网络 = 层的复合
    nn.Linear(28 * 28, 128), nn.ReLU(),
    # 全连接 + 非线性激活
    nn.Dropout(0.2),
    # 训练时随机丢神经元，防过拟合
    nn.Linear(128, 10),
)
logits = model(x)
# 前向：x → 隐藏层 → 输出

loss = nn.functional.cross_entropy(logits, y)
# 损失：预测与真值的差距
loss.backward()
# 反向：autograd 沿计算图算出每个参数的梯度
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
optimizer.step(); optimizer.zero_grad()
# 更新参数并清梯度（不清会累积——新手 bug 常客）

# 完整训练循环的骨架（每个 AI 岗项目都是它的变体）
for epoch in range(10):
    model.train()
    # 训练模式：Dropout/BN 生效
    for xb, yb in train_loader:
    # DataLoader：批量、打乱、多进程取数
        xb, yb = xb.to(device), yb.to(device)
        # device = cuda/cpu——CPU 算不动矩阵就换 GPU
        optimizer.zero_grad()
        loss = nn.functional.cross_entropy(model(xb), yb)
        loss.backward(); optimizer.step()
    model.eval()
    # 评估模式：关掉 Dropout、BN 用累积统计
    with torch.no_grad():
    # 推理不算梯度——省显存防误更新
        acc = evaluate(model, val_loader)
    if acc > best: torch.save(model.state_dict(), "best.pt")
    # 早停+存 checkpoint
```

</template>

<template #js>

```js
import * as tf from "@tensorflow/tfjs";

const model = tf.sequential({
  layers: [
    tf.layers.dense({ inputShape: [28 * 28], units: 128, activation: "relu" }),
    tf.layers.dropout({ rate: 0.2 }),
    // ≈ nn.Dropout
    tf.layers.dense({ units: 10, activation: "softmax" }),
  ],
});
model.compile({
  optimizer: tf.train.adam(1e-3),
  // ≈ AdamW（TF.js 没有内置 AdamW）
  loss: "categoricalCrossentropy",
  // ≈ cross_entropy
  metrics: ["accuracy"],
});

await model.fit(trainX, trainY, {
  epochs: 10,
  batchSize: 64,
  validationData: [valX, valY],
  callbacks: {
    onEpochEnd: async (epoch, logs) => {
      if (logs.val_acc > best) await model.save("file://./best-model");
      // ≈ state_dict
    },
  },
});
// TF.js 的 fit 内部已经做了 zero_grad → backward → step，不需要手写循环
```

</template>

</CodeCompare>

| PyTorch | TensorFlow.js |
| --- | --- |
| `tensor(requires_grad=True)` | `tf.tensor().variable()` + `tf.grad()` |
| `nn.Sequential` | `tf.sequential` |
| `loss.backward(); optimizer.step()` | `model.fit()` 内部自动 |
| `model.eval()` + `torch.no_grad()` | `model.predict()` |
| `torch.save(state_dict)` | `model.save()` |
| CUDA GPU | WebGL / WebGPU 后端（浏览器）/ Node 原生后端 |

必须建立的概念：**层是带参数的函数、损失衡量差距、反向传播算梯度、优化器沿梯度下降、batch/epoch/lr 是三大旋钮**。显存爆了先减 batch size。

## 四、Transformer：现代 AI 的发动机（概念课）

- 一句话原理：把文本切成 token → 每个 token 变成向量 → **自注意力机制让每个 token 直接"看"所有其他 token 并按相关性加权聚合信息** → 逐层精炼 → 输出下一个 token 的概率分布。
- 为什么它赢了一切：注意力打破了 RNN 的顺序瓶颈——**可并行训练 + 任意距离依赖**，这两条让"大力出奇迹"（海量数据 × 巨量参数）成为可能。
- 关键术语（面试高频，下一站全程使用）：

| 术语 | 一句话 |
| --- | --- |
| Token / BPE | 模型眼中的最小单位，中文约 1-2 字/token；按 token 计费 |
| Context window | 一次能"看"的上下文长度（128K 很常见），超出即截断/遗忘 |
| Embedding | 把 token/句子映射为高维向量，语义近则向量近——RAG 的数学基础 |
| KV Cache | 推理时缓存历史 key/value 换速度——显存大户，长对话成本来源 |
| Temperature / top_p | 采样随机性旋钮：0 趋确定性，高更有创造性也更易胡说 |
| RLHF / DPO | 用人类偏好对齐输出的训练阶段——"为什么模型礼貌但有立场" |

**JS 对照：** 这些概念在 JS 里直接可用——`@xenova/transformers`（现 `@huggingface/transformers`）能在浏览器/Node 里跑 BERT、Embedding 和小语言模型；`transformers.js` 的 `pipeline("feature-extraction")` 就是 Python `transformers` 的同名 API。RAG 的向量检索部分前端完全可以用 JS 实现，调用的仍是同一套 Embedding 概念。

## 五、huggingface 生态五分钟体验

<CodeCompare>

<template #python>

```python
from transformers import pipeline

clf = pipeline("sentiment-analysis")
# 自动下载模型：评论情感
print(clf("这个产品太好用了！"))
# [{'label': 'POSITIVE', 'score': 0.999}]

gen = pipeline("text-generation", model="Qwen/Qwen2.5-0.5B-Instruct")
print(gen("写一句关于秋天的诗", max_new_tokens=40))
# 本地跑通生成式模型
```

</template>

<template #js>

```js
import { pipeline } from "@huggingface/transformers";

const clf = await pipeline("sentiment-analysis");
console.log(await clf("这个产品太好用了！"));
// [{ label: 'POSITIVE', score: 0.999 }]

const gen = await pipeline("text-generation", "Qwen/Qwen2.5-0.5B-Instruct");
console.log(await gen("写一句关于秋天的诗", { max_new_tokens: 40 }));
// API 名字几乎一模一样，区别只是 await + 模型格式（ONNX）
```

</template>

</CodeCompare>

- HF Hub 之于 AI ≈ PyPI 之于 Python：模型/数据集/演示托管；`transformers`、`datasets`、`peft`（微调）三件套先混脸熟。JS 对应 `@huggingface/transformers` + `@huggingface/hub`。
- 本地跑小模型（0.5B-7B）用 **Ollama**（一条命令 `ollama run qwen2.5:7b`，带 OpenAI 兼容 API）——下一站 RAG 实验的免费引擎。JS 侧 `ollama-js` 直接调用。

## 六、应用岗学到什么程度？

| 层次 | 内容 | 达标线 |
| --- | --- | --- |
| 必须 | ML 世界观 + sklearn 一条龙 + PyTorch 训练循环能读懂 | 独立完成 Kaggle 入门赛铜牌水平 |
| 必须 | Transformer 概念 + transformers 库调用 | 能向面试官讲清自注意力"是什么、解决什么" |
| 加分 | 微调实操（LoRA 跑通过一次） | 见下一站微调节 |
| 算法岗才要 | 手撕反向传播、读论文复现 SOTA | 应用岗不必自我加压 |

JS 同学额外注意：TF.js / Transformers.js 足以跑通概念和推理，但**训练大模型、微调、GBDT 表格 ML 仍以 Python 为主**。学 Python 版代码是为了能看懂整条 AI 工具链。

## 七、本章自检清单

1. 为什么测试集"只能碰一次"？验证集和测试集分工？
2. 类别不平衡 1:99，准确率 98% 说明什么？该看什么指标？
3. 交叉验证防的是什么？为什么 scaler 必须放进 Pipeline？
4. GBDT 和随机森林的哲学差异（串行纠错 vs 并行投票）？
5. `optimizer.zero_grad()` 不写会怎样？`model.eval()` 和 `torch.no_grad()` 各管什么？（TF.js 为什么不用写？）
6. 自注意力解决了 RNN 的什么问题？
7. Temperature 调高调低分别适合什么任务？
8. 什么是 KV Cache，为什么长对话又贵又慢？

下一站 → [大模型应用开发](./llm-dev)：把模型能力变成产品能力。
