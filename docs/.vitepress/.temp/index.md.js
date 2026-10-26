import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"IKE Press","text":"一个程序员的碎碎念","tagline":"写代码，也写闲话。这里记录我踩过的坑、造过的轮子，和一些没什么用但很有趣的小东西。","image":{"src":"/favicon.png","alt":"IKE Press"},"actions":[{"theme":"brand","text":"随便逛逛","link":"/guide/"},{"theme":"alt","text":"先搞明白这站怎么来的","link":"/guide/getting-started"}]},"features":[{"icon":{"src":"/flutter.svg","width":28,"height":28,"wrap":true},"title":"Flutter","details":"Flutter 跨端开发学习笔记，从 Dart 语言到上架一款完整 App。","link":"/flutter/"},{"icon":"🖖","title":"Vue 组件支持","details":"可在 Markdown 中直接使用 Vue 组件，也可以使用全局组件和布局插槽。"},{"icon":{"src":"/nestjs.svg","width":28,"height":28,"wrap":true},"title":"NestJS 后端笔记","details":"给前端工程师的后端入门笔记：从框架原理到实战，用 TypeScript 搞懂服务端。","link":"/nestjs/"},{"icon":"🌗","title":"深色模式","details":"默认支持浅色/深色主题切换，可自定义品牌色与排版。"},{"icon":"📱","title":"移动端适配","details":"响应式设计，移动端侧边栏与导航自动适配。"},{"icon":"🚢","title":"静态站点导出","details":"一条命令构建出纯静态产物，可部署到任意静态托管平台。"}]},"headers":[],"relativePath":"index.md","filePath":"index.md","lastUpdated":1792656298000}');
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
