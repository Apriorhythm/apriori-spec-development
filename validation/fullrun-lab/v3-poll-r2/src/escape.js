'use strict';
// 输出安全 / XSS 防线（PC-15，STEP2 SPEC-1）。

// SSR 文本插值：映射到 HTML 实体。先替换 & 以免二次转义。
function htmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// U+2028 / U+2029 用 fromCharCode 构造，避免源码里出现裸行分隔符。
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

// 内联 <script> 里的 JSON：JSON.stringify 后把会破坏脚本上下文的字符替换为
// 安全 ASCII \uXXXX 转义序列（不是原字符）。产出源码中不含裸 </script、<script，
// 也不含实际 U+2028/U+2029 行分隔符。
function jsonForScript(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(LS).join('\\u2028')
    .split(PS).join('\\u2029');
}

module.exports = { htmlEscape, jsonForScript };
