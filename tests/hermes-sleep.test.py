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
        for text in ['我起床了','早上好','早安','早上好澄']:
            self.assertEqual(plugin.phrase(text),'wake')
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
        result=plugin.check_in({'text':'晚安','request_id':str(uuid.uuid4()),'at':'2026-01-01T23:30:00+08:00'})
        self.assertTrue(result['alreadyRecorded']);self.assertEqual(len(calls),1);self.assertEqual(calls[0]['op'],'read')
    def test_register_narrow_native_tools_and_prompt(self):
        tools=[]
        class Context:
            def register_tool(self,**kw):tools.append(kw)
            def register_system_prompt_section(self,*a,**kw):pass
        plugin.register(Context());self.assertEqual(len(tools),4)
        for item in tools:self.assertEqual(item['toolset'],'hermes-weixin');self.assertFalse(item['schema']['parameters']['additionalProperties'])
    def test_missing_time_never_uses_tool_clock(self):
        plugin.call=lambda q:self.fail('must not write or read without timestamp')
        with self.assertRaisesRegex(ValueError,'原始消息时间'):
            plugin.check_in({'text':'早上好澄','request_id':str(uuid.uuid4())})
    def test_correct_replay_readback_and_single_field(self):
        old=str(uuid.uuid4()); new=str(uuid.uuid4()); calls=[]
        params={'kind':'wake','day':'2026-01-02','at':'2026-01-02T08:14:52+08:00','expected_revision':old,'request_id':str(uuid.uuid4())}
        def send(q):
            calls.append(q)
            if q['op']=='correct':
                self.assertNotIn('bedtimeAt',q);self.assertEqual(q['expectedRevision'],old)
                if len(calls)==1:raise TimeoutError()
                return {'appliedRevision':new,'replayed':True}
            return {'entry':{'revision':new,'wakeAt':params['at'],'bedtimeAt':'2026-01-01T23:30:00+08:00'}}
        plugin.call=send
        self.assertIn('error',json.loads(plugin.safe(plugin.correct)(params)))
        result=plugin.correct(params);self.assertTrue(result['verified']);self.assertEqual(calls[0],calls[1])
        with self.assertRaises(ValueError):plugin.correct({**params,'at':'2026-01-02T08:15:00+08:00'})
    def test_correct_conflict_never_refreshes_revision(self):
        calls=[]
        def send(q):calls.append(q);return {'error':{'message':'CONFLICT'}}
        plugin.call=send
        p={'kind':'wake','day':'2026-01-02','at':'2026-01-02T08:14:52+08:00','expected_revision':str(uuid.uuid4()),'request_id':str(uuid.uuid4())}
        with self.assertRaisesRegex(ValueError,'CONFLICT'):plugin.correct(p)
        self.assertEqual(len(calls),1)
    def test_correct_fractional_seconds_and_offset(self):
        revision=str(uuid.uuid4()); payloads=[]
        def send(q):
            if q['op']=='correct':payloads.append(q);return {'appliedRevision':revision}
            return {'entry':{'revision':revision,'wakeAt':'2026-01-02T00:14:52.123Z'}}
        plugin.call=send
        result=plugin.correct({'kind':'wake','day':'2026-01-02','at':'2026-01-02T01:14:52.123456+01:00','expected_revision':str(uuid.uuid4()),'request_id':str(uuid.uuid4())})
        self.assertTrue(result['verified']);self.assertEqual(payloads[0]['wakeAt'],'2026-01-02T08:14:52.123+08:00')

if __name__=='__main__':unittest.main()
