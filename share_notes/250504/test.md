---
title: "我的第一篇笔记"
date: "2024-05-10"
tags: ["示例", "Next.js", "Markdown"]
description: "这是使用 Next.js 和 Markdown 创建的第一篇示例笔记。"
---

## 欢迎来到我的笔记

这是笔记的正文部分。您可以在这里写下您的想法和记录。

### Markdown 功能测试
* 列表项一
* 列表项二

**加粗文本** 和 *斜体文本*。

链接到 [我的网站](https://www.marcusao.com)。

> 这是一个引用的区块。

代码块示例：
```python
import torch
import torch.nn as nn
import torch.optim as optim

# 定义CBOW模型
class CBOWModel(nn.Module):
	def __init__(self, vocab_size, embed_size):
		super(CBOWModel, self).__init__()
		self.embeddings = nn.Embedding(vocab_size, embed_size)
		self.linear = nn.Linear(embed_size, vocab_size)

	def forward(self, context):
		context_embeds = self.embeddings(context).sum(dim=1)
		output = self.linear(context_embeds)
		return output

context_size = 2
raw_text = "embeddings are really tough"
tokens = raw_text.split()
vocab = set(tokens)
word_to_index = {word: i for i, word in enumerate(vocab)}
data = []
for i in range(2, len(tokens) - 2):
	context = [word_to_index[word] for word in tokens[i - 2:i] + tokens[i + 1:i + 3]]
	target = word_to_index[tokens[i]]
	data.append((torch.tensor(context), torch.tensor(target)))

# 超参数定义
vocab_size = len(vocab)
embed_size = 10
learning_rate = 0.01
epochs = 100

# 初始化CBOW模型
cbow_model = CBOWModel(vocab_size, embed_size)
criterion = nn.CrossEntropyLoss()
optimizer = optim.SGD(cbow_model.parameters(), lr=learning_rate)

# 训练循环
for epoch in range(epochs):
	total_loss = 0
	for context, target in data:
		optimizer.zero_grad()
		output = cbow_model(context)
		loss = criterion(output.unsqueeze(0), target.unsqueeze(0))
		loss.backward()
		optimizer.step()
		total_loss += loss.item()
	print(f"Epoch {epoch + 1}, Loss: {total_loss}")

word_to_lookup = "embeddings"
word_index = word_to_index[word_to_lookup]
embedding = cbow_model.embeddings(torch.tensor([word_index]))
print(f"Embedding for '{word_to_lookup}': {embedding.detach().numpy()}")
```

图片引用 (我们将在后续步骤中处理图片的实际显示):
![[Stamp Act.jpg]]
