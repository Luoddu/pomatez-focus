import importlib.util
import json
import tempfile
import unittest
import uuid
import subprocess
import sys
import types
import hashlib
import os
from unittest.mock import patch
from pathlib import Path

spec=importlib.util.spec_from_file_location('sleep_plugin',Path(__file__).parents[1]/'integrations/hermes-sleep/__init__.py')
plugin=importlib.util.module_from_spec(spec);spec.loader.exec_module(plugin)

class SleepBridgeTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.runtime,self.call,self.authorize=plugin.runtime,plugin.call,plugin.authorize
        plugin.runtime=lambda:{'state':self.temp.name}
        plugin.authorize=lambda:None
        self.addCleanup(self.restore)
    def restore(self):plugin.runtime,plugin.call,plugin.authorize=self.runtime,self.call,self.authorize
    def test_authenticated_context(self):
        values={'HERMES_SESSION_PLATFORM':'weixin','HERMES_SESSION_CHAT_TYPE':'dm','HERMES_SESSION_USER_ID':'synthetic-owner'}
        module=types.ModuleType('gateway.session_context');module.get_session_env=lambda k:values.get(k,'')
        plugin.runtime=lambda:{'allowed_user_sha256':hashlib.sha256(b'synthetic-owner').hexdigest()}
        with patch.dict(sys.modules,{'gateway.session_context':module}), patch.dict(os.environ,{'WEIXIN_ALLOWED_USERS':'synthetic-owner'}):
            self.authorize()
            for key,value in [('HERMES_SESSION_USER_ID','other'),('HERMES_SESSION_PLATFORM','cli'),('HERMES_SESSION_CHAT_TYPE','group'),('HERMES_CRON_SESSION','1')]:
                with patch.dict(values,{key:value}):
                    with self.assertRaises(ValueError):self.authorize()
    def test_kernel_lock_crash_recovery(self):
        lock=Path(self.temp.name)/'crash.lock'
        script="import importlib.util,os,sys;from pathlib import Path;s=importlib.util.spec_from_file_location('p',sys.argv[1]);p=importlib.util.module_from_spec(s);s.loader.exec_module(p);c=p.request_lock(Path(sys.argv[2]));c.__enter__();print('locked',flush=True);sys.stdin.readline();os._exit(7)"
        child=subprocess.Popen([sys.executable,'-c',script,plugin.__file__,str(lock)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
        self.assertEqual(child.stdout.readline().strip(),'locked')
        with self.assertRaises(ValueError):
            with plugin.request_lock(lock):pass
        child.stdin.write('\n');child.stdin.flush();self.assertEqual(child.wait(timeout=5),7)
        child.stdin.close();child.stdout.close()
        with plugin.request_lock(lock):pass
    def test_phrases_and_quotes(self):
        for text in ['我要睡了','晚安！','我要睡了，晚安。']:self.assertEqual(plugin.phrase(text),'bedtime')
        for text in ['我起床了','早上好','早安']:self.assertEqual(plugin.phrase(text),'wake')
        for text in ['他说晚安','明天我要睡了','“晚安”','不要记录晚安','如果说我起床了呢','晚安是什么意思']:
            with self.assertRaises(ValueError):plugin.phrase(text)
    def test_unknown_result_retries_identical_payload(self):
        calls=[]
        def send(q):
            calls.append(q)
            if q['op']=='read':return {'entry':{'revision':None,'bedtimeAt':None,'wakeAt':None}}
            if len(calls)==2:raise TimeoutError()
            return {'entry':{'bedtimeAt':q['at']},'replayed':True}
        plugin.call=send
        p={'text':'晚安','request_id':str(uuid.uuid4()),'at':'2026-01-01T23:30:00+08:00'}
        self.assertIn('error',json.loads(plugin.safe(plugin.check_in)(p)))
        self.assertTrue(plugin.check_in(p)['replayed']);self.assertEqual(calls[-1],calls[-2]);self.assertEqual(len(calls),3)
        with self.assertRaises(ValueError):plugin.check_in({**p,'at':'2026-01-02T23:30:00+08:00'})
    def test_existing_kept_and_read_not_write(self):
        calls=[]
        def send(q):calls.append(q);return {'entry':{'revision':'old','bedtimeAt':'saved','wakeAt':None}}
        plugin.call=send
        result=plugin.check_in({'text':'晚安','request_id':str(uuid.uuid4())})
        self.assertTrue(result['alreadyRecorded']);self.assertEqual(len(calls),1);self.assertEqual(calls[0]['op'],'read')
    def test_register_narrow_native_tools_and_prompt(self):
        tools=[]
        class Context:
            def register_tool(self,**kw):tools.append(kw)
            def register_system_prompt_section(self,*a,**kw):pass
        plugin.register(Context());self.assertEqual(len(tools),3)
        for item in tools:self.assertEqual(item['toolset'],'hermes-weixin');self.assertFalse(item['schema']['parameters']['additionalProperties'])

if __name__=='__main__':unittest.main()
