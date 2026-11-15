"""Synthetic identity; real Hermes context and Python -> stdio -> Electron transport."""
import hashlib
import importlib.util
import json
import sys
import uuid
import os
from pathlib import Path
from gateway.session_context import set_session_vars

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('sleep_fixture',root/'integrations/hermes-sleep/__init__.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
cfg={'node':sys.argv[1],'client':str(root/'app/electron/src/assets/sleep-client.cjs'),'state':sys.argv[2],
     'allowed_user_sha256':hashlib.sha256(b'synthetic-owner').hexdigest()}
p.runtime=lambda:cfg
os.environ['WEIXIN_ALLOWED_USERS']='synthetic-owner'
set_session_vars(platform='weixin',chat_type='dm',user_id='synthetic-owner')
request={'text':'晚安','request_id':str(uuid.uuid4()),'at':'2026-01-01T23:30:00+08:00'}
first=p.check_in(request);assert not first.get('error'),first
again=p.check_in(request);assert again.get('replayed'),again
assert first['entry']['revision']==again['entry']['revision']
set_session_vars(platform='weixin',chat_type='dm',user_id='other')
try:p.check_in({**request,'request_id':str(uuid.uuid4())})
except ValueError:pass
else:raise AssertionError('unauthorized identity accepted')
print(json.dumps({'passed':3,'checks':['real Hermes context and bridge write','same request replay','other user denied']}))
