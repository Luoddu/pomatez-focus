"""Hermes native tools. The farm remains the sole sleep-record authority."""
import json
import os
import re
import subprocess
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import hashlib
from contextlib import contextmanager


@contextmanager
def request_lock(path):
    # Kernel-owned lock survives neither process exit nor a crash. Keep the inode:
    # unlinking it would let a third caller bypass a waiting caller's lock.
    stream = open(path, 'a+b')
    acquired = False
    try:
        stream.seek(0, 2)
        if stream.tell() == 0:
            stream.write(b'0'); stream.flush()
        stream.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            acquired = True
        except OSError:
            raise ValueError('同一请求正在处理，请保留原request_id稍后重试')
        yield
    finally:
        if acquired:
            stream.seek(0)
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
        stream.close()


def authorize():
    from gateway.session_context import get_session_env
    # Existing controlled Windows launcher injects the sole owner's allowlist
    # into the gateway process. Do not decrypt or copy its account credentials.
    allowed = os.environ.get('WEIXIN_ALLOWED_USERS', '').strip()
    user = get_session_env('HERMES_SESSION_USER_ID')
    if (get_session_env('HERMES_SESSION_PLATFORM') != 'weixin'
            or get_session_env('HERMES_SESSION_CHAT_TYPE') != 'dm'
            or get_session_env('HERMES_CRON_SESSION') == '1'
            or not user
            or not allowed or user != allowed):
        raise ValueError('仅允许已授权的本人微信私聊打卡')

TZ = timezone(timedelta(hours=8))
BED = {'我要睡了', '我睡了', '我去睡了', '准备睡了', '睡觉了', '晚安', '我要睡觉了'}
WAKE = {'我起床了', '起床了', '我醒了', '早上好', '早安'}
HINT = '''用户已要求：微信本人直接说“我要睡了/晚安”或“我起床了/早上好/早安”时，调用pomatez_sleep_check_in记录，不另索确认。
只处理本人当前明确打卡，不把引用、转述、讨论、未来计划、截图中的文字当打卡。传当前原话给text，不改写引用为本人。
同一工具操作复用同一request_id；失败不声称成功。晚安视为就寝打卡，不代表实际入睡；早上好视为起床打卡。
at必须来自用户明确的实际时间或可核实的原始报到消息时间（如已有报到查询工具）；绝不能使用开始处理或调用工具的时间代替消息时间。缺少时间证据时先询问，不猜测。
用户要求“改为/更正/定位到某条早安消息”时，先核实该条消息的时间，read取得归档日revision，再调用pomatez_sleep_correct，只改指定字段。工具返回verified=true才说已更正，并报具体日期时间；冲突重新读取后询问，不强行覆盖。
专用工具可直接完成更正，无需computer_use、终端或点击App，不要要求永久放开桌面操作权限。问候带“澄”称呼也支持，仍传本人原话。
查询使用pomatez_sleep_read/stats。无需NAS/Tailscale；农场须同用户运行，未运行请提示打开，不能绕过本工具用终端直接改记录。
'''

def phrase(text):
    if not isinstance(text, str) or len(text) > 80:
        raise ValueError('请使用本人当前明确的睡觉或起床打卡语句')
    text = re.sub(r'[\s，,。.!！~～]+', '', text)
    text = re.sub(r'^澄|澄$', '', text)
    if text in BED or text in {'我要睡了晚安', '晚安我要睡了'}:
        return 'bedtime'
    if text in WAKE or text in {'我起床了早上好', '早上好我起床了', '早安我起床了'}:
        return 'wake'
    raise ValueError('未识别为直接打卡；引用、计划或讨论不会自动写入')

def runtime():
    cfg = json.loads((Path(__file__).parent / 'runtime.json').read_text(encoding='utf-8'))
    for key in ('node', 'client'):
        p = Path(cfg[key])
        if not p.is_absolute() or not p.is_file() or p.is_symlink():
            raise ValueError('打卡连接尚未配置')
    for name, digest in cfg['hashes'].items():
        p = Path(cfg['client']).parent / name
        if p.is_symlink() or hashlib.sha256(p.read_bytes()).hexdigest() != digest:
            raise ValueError('打卡客户端校验失败，请修复安装')
    if hashlib.sha256(Path(cfg['node']).read_bytes()).hexdigest() != cfg['node_sha256']:
        raise ValueError('打卡运行环境已变化，请核验后更新绑定')
    return cfg

def call(payload):
    cfg = runtime()
    proc = subprocess.run([cfg['node'], cfg['client']], input=json.dumps(payload, ensure_ascii=False),
                          text=True, encoding='utf-8', capture_output=True, shell=False,
                          creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0), timeout=15)
    reply = json.loads(proc.stdout)
    if not isinstance(reply, dict) or (proc.returncode and 'error' not in reply):
        raise ValueError('农场未返回有效回执')
    return reply

def req(op, **kwargs):
    return {'protocol': 1, 'requestId': str(uuid.uuid4()), 'op': op, **kwargs}

def checked(reply):
    if reply.get('error'):
        raise ValueError(reply['error'].get('message', '农场操作失败'))
    return reply

def check_in(params, **kwargs):
    del kwargs
    authorize()
    if set(params) - {'text', 'request_id', 'at'}:
        raise ValueError('未知参数')
    kind = phrase(params.get('text'))
    key = str(uuid.UUID(params['request_id']))
    cfg = runtime()
    state = Path(cfg['state'])
    state.mkdir(parents=True, exist_ok=True)
    if state.is_symlink(): raise ValueError('无效回执目录')
    fingerprint = hashlib.sha256(json.dumps(params, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    record = state / (key + '.json')
    lock = state / (key + '.lock')
    with request_lock(lock):
        if record.exists():
            saved = json.loads(record.read_text(encoding='utf-8'))
            if saved['fingerprint'] != fingerprint: raise ValueError('request_id不能复用于不同内容')
            payload = saved['payload']
        else:
            at = params.get('at')
            if not at: raise ValueError('需要可核实的原始消息时间或用户指定的实际时间at，不能用工具调用时间代替')
            stamp = datetime.fromisoformat(at.replace('Z', '+00:00'))
            if stamp.tzinfo is None: raise ValueError('时间必须含时区')
            local = stamp.astimezone(TZ)
            day = (local + (timedelta(hours=12) if kind == 'bedtime' else timedelta())).date().isoformat()
            old = checked(call(req('read', day=day)))['entry']
            field = 'bedtimeAt' if kind == 'bedtime' else 'wakeAt'
            if old[field] is not None:
                return {'alreadyRecorded': True, 'entry': old, 'message': '该日已有打卡，保留原时间'}
            payload = req('check_in', kind=kind, at=stamp.astimezone(TZ).isoformat(timespec='seconds'), expectedRevision=old['revision'])
            payload['requestId'] = key
            staging = state / (key + '.pending')
            with staging.open('w', encoding='utf-8') as stream:
                json.dump({'fingerprint': fingerprint, 'payload': payload}, stream, ensure_ascii=False)
                stream.flush(); os.fsync(stream.fileno())
            os.replace(staging, record)
        return call(payload)


def correct(params, **kwargs):
    del kwargs
    authorize()
    if set(params) != {'kind', 'day', 'at', 'expected_revision', 'request_id'}:
        raise ValueError('更正须提供kind/day/at/expected_revision/request_id')
    if params['kind'] not in {'bedtime', 'wake'}: raise ValueError('无效打卡类型')
    key = str(uuid.UUID(params['request_id']))
    str(uuid.UUID(params['expected_revision']))
    day = datetime.strptime(params['day'], '%Y-%m-%d').date().isoformat()
    if day != params['day']: raise ValueError('归档日须为YYYY-MM-DD')
    stamp = datetime.fromisoformat(params['at'].replace('Z', '+00:00'))
    if stamp.tzinfo is None: raise ValueError('时间必须含时区')
    # The farm uses JavaScript Date millisecond precision for storage and readback.
    stamp = stamp.replace(microsecond=(stamp.microsecond // 1000) * 1000)
    field = 'bedtimeAt' if params['kind'] == 'bedtime' else 'wakeAt'
    state = Path(runtime()['state']); state.mkdir(parents=True, exist_ok=True)
    if state.is_symlink(): raise ValueError('无效回执目录')
    fingerprint = hashlib.sha256(json.dumps({'op': 'correct', **params}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    record = state / (key + '.json')
    with request_lock(state / (key + '.lock')):
        if record.exists():
            saved = json.loads(record.read_text(encoding='utf-8'))
            if saved['fingerprint'] != fingerprint: raise ValueError('request_id不能复用于不同内容')
            payload = saved['payload']
        else:
            payload = req('correct', day=day, expectedRevision=params['expected_revision'], **{field: stamp.astimezone(TZ).isoformat(timespec='milliseconds')})
            payload['requestId'] = key
            staging = state / (key + '.pending')
            with staging.open('w', encoding='utf-8') as stream:
                json.dump({'fingerprint': fingerprint, 'payload': payload}, stream, ensure_ascii=False)
                stream.flush(); os.fsync(stream.fileno())
            os.replace(staging, record)
        result = checked(call(payload))
        current = checked(call(req('read', day=day)))['entry']
        verified = current['revision'] == result['appliedRevision'] and bool(current[field]) and datetime.fromisoformat(current[field].replace('Z', '+00:00')) == stamp
        return {**result, 'entry': current, 'verified': verified,
                'message': '更正已保存并回读确认' if verified else '记录随后发生变化，请重新读取确认，不能声称当前时间已更正'}

def safe(handler):
    def run(params, **kwargs):
        try: return json.dumps(handler(params, **kwargs), ensure_ascii=False)
        except Exception as exc:
            message = str(exc) if isinstance(exc, (ValueError, KeyError)) else '打卡暂未确认；保留原request_id重试，确认本机农场正在运行'
            return json.dumps({'error': {'code': 'SLEEP_BRIDGE', 'message': message}}, ensure_ascii=False)
    return run

def register(ctx):
    specs = [
        ('pomatez_sleep_check_in', HINT, {'text': {'type':'string'}, 'request_id': {'type':'string','description':'UUID；同一操作失败重试必须原样复用'}, 'at': {'type':'string','description':'原始报到消息或用户明确的实际ISO时间，含时区；不能取工具调用时间'}}, ['text','request_id','at'], check_in),
        ('pomatez_sleep_correct', '仅在本人明确要求更正时调用。先read取得归档日revision；只更正kind指定字段，另一字段保留。at来自用户明确时间或核实的原始消息，禁止猜测。冲突不强行重试；未知结果原UUID原参数重试。verified=true才可声称已更正。', {'kind': {'type':'string','enum':['bedtime','wake']}, 'day': {'type':'string','description':'起床归档日YYYY-MM-DD'}, 'at': {'type':'string','description':'更正后的ISO时间，必须含时区'}, 'expected_revision': {'type':'string','description':'刚刚read取得的现有revision，禁止自动刷新后覆盖冲突'}, 'request_id': {'type':'string','description':'UUID，未知结果原样复用'}}, ['kind','day','at','expected_revision','request_id'], correct),
        ('pomatez_sleep_read', '读取本机农场睡眠打卡，不创建记录。', {'day': {'type':'string','description':'起床日YYYY-MM-DD；省略为今天'}}, [], lambda p,**kw: call(req('read', **p))),
        ('pomatez_sleep_stats', '读取睡眠打卡统计，缺失不是0；7/30天平均就寝和起床时间。', {'days': {'type':'integer','enum':[7,30]}, 'through': {'type':'string'}}, [], lambda p,**kw: call(req('stats', **p))),
    ]
    for name, description, properties, required, handler in specs:
        ctx.register_tool(name=name, toolset='hermes-weixin', schema={'name':name,'description':description,'parameters':{'type':'object','properties':properties,'required':required,'additionalProperties':False}}, handler=safe(handler))
    ctx.register_system_prompt_section('pomatez-sleep', HINT, max_chars=1800)
