const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { build } = require('esbuild');
test('pinned i18n initialization returns translated strings, keeps English fallback and rejects null results', async () => {
  // Only stored language is synthetic; execute the real initialization and resources.
  const result = await build({entryPoints:['app/renderer/src/i18n/index.ts'],bundle:true,platform:'node',format:'cjs',write:false,tsconfig:'app/renderer/tsconfig.json',plugins:[{name:'stored-language-fixture',setup(b){b.onResolve({filter:/^utils$/},()=>({path:'utils',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"export const getFromStorage = () => ({settings:{language:'zh'}});",loader:'js'}));}}],external:['i18next','react-i18next']});
  const module = {exports:{}};
  vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,require,console});
  const i18n = module.exports.default;
  await i18n.changeLanguage('zh');
  assert.equal(i18n.options.returnNull,false);
  assert.equal(i18n.t('nav.taskList'),'任务列表');
  assert.notEqual(i18n.t('nav.taskList'),'nav.taskList');
  assert.equal(i18n.t('missing_test_key'),'missing_test_key');
  i18n.addResource('zh','translation','null_test_key',null);
  i18n.addResource('en','translation','null_test_key','English fallback');
  assert.equal(i18n.t('null_test_key'),'English fallback');
  await i18n.changeLanguage('en');
  assert.equal(i18n.t('nav.taskList'),'Task List');
});
