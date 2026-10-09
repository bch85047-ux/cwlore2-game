#!/usr/bin/env python3
"""皇冠档案 · 单文件构建"""
import json, pathlib, re, datetime

D = pathlib.Path(__file__).parent
people = json.load(open(D / "data.json", encoding="utf-8"))["people"]

data_js = (D / "data.js").read_text(encoding="utf-8")
lands_js = (D / "lands.js").read_text(encoding="utf-8")
app_js = (D / "app.js").read_text(encoding="utf-8")
css = (D / "style.css").read_text(encoding="utf-8")
body = (D / "body.html").read_text(encoding="utf-8")

assert "__PEOPLE__" in data_js, "data.js 缺占位符"
data_js = data_js.replace("__PEOPLE__", json.dumps(people, ensure_ascii=False))
blob = data_js + "\n" + lands_js

assert "__DATA__" in body and "__APP__" in body
body = body.replace("__DATA__", blob).replace("__APP__", app_js)

head = (
  '<!doctype html>\n<html lang="zh-CN">\n<head>\n'
  '<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
  '<meta name="theme-color" content="#e6dfcf">\n'
  '<title>皇冠档案 · 卡牌世界观图鉴</title>\n'
  '<style>\n' + css + '\n</style>\n</head>\n<body>\n'
)

out = head + body
out = re.sub(r"\n{3,}", "\n\n", out)

# 简单校验
assert "<script>\n" in out and "</script>" in out
assert "const PEOPLE = [" in out
for name in ["字母", "张猪", "苏苏", "Jking7", "皇冠最初拥有者"]:
    assert name in out, name

dst = D / "index.html"
dst.write_text(out, encoding="utf-8")
print(f"index.html  {len(out):,} bytes")
n_gloss = blob.count('mech:"')
print(f"人物 {len(people)} · 词条 {n_gloss} · 段位 6 段 · 势力 2 大陆")
