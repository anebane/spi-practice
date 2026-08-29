#!/usr/bin/env python3
"""取得系スクリプトに、作った応答を食わせて挙動を測るための実験台。

⚠️ 本物のAPIは叩かない。認証も使わない。
   svc / client を差し替えてから main() を呼ぶので、ネットワークに出ない。

使い方: probe-fetch.py <gsc|ga4> <ケース名> <出力先>
  終了コードをそのまま返し、標準出力に本体の出力を流す。
"""
import importlib.util, io, json, os, sys, contextlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load(rel, name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, rel))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m

# ---- GSC ----
class _Q:
    def __init__(self, r): self.r = r
    def execute(self): return self.r
class _SA:
    def __init__(self, f): self.f = f
    def query(self, siteUrl=None, body=None): return _Q(self.f(body))
class _Svc:
    def __init__(self, f): self.f = f
    def searchanalytics(self): return _SA(self.f)

def _gsc_normal(b):
    keys = ["k"] if b["dimensions"] else []
    return {"rows": [{"keys": keys, "clicks": 5, "impressions": 50, "ctr": 0.1, "position": 3.5}]}

GSC = {
    "normal":        _gsc_normal,
    "empty":         lambda b: {},
    "empty-rows":    lambda b: {"rows": []},
    "schema-change": lambda b: {"data": _gsc_normal(b)["rows"]},
}

# ---- GA4 ----
class _V:
    def __init__(s, v): s.value = v
class _Row:
    def __init__(s, d, m):
        s.dimension_values = [_V(x) for x in d]
        s.metric_values = [_V(x) for x in m]
class _Resp:
    def __init__(s, rows, rc=None):
        s.rows = rows
        s.row_count = len(rows) if rc is None else rc
class _NoRows:
    pass

def _ga4_normal(req):
    n = len(req.dimensions)
    return _Resp([_Row([f"d{i}" for i in range(n)], ["7"])])

GA4 = {
    "normal":        _ga4_normal,
    "empty":         lambda req: _Resp([]),
    "partial":       lambda req: _Resp([], rc=1000),
    "schema-change": lambda req: _NoRows(),
}

def main():
    which, case, out = sys.argv[1], sys.argv[2], sys.argv[3]
    if which == "gsc":
        if case not in GSC: sys.exit(f"未知のケース: {case}")
        m = load("tools/gsc/fetch.py", "probe_gsc")
        m.service = lambda: _Svc(GSC[case])
    else:
        if case not in GA4: sys.exit(f"未知のケース: {case}")
        import google.analytics.data_v1beta as G
        f = GA4[case]
        class FakeClient:
            def __init__(s, **kw): pass
            def run_report(s, req): return f(req)
        G.BetaAnalyticsDataClient = FakeClient
        m = load("tools/ga4/fetch.py", "probe_ga4")
        m.creds = lambda: None
    extra = sys.argv[4:] if len(sys.argv) > 4 else []
    sys.argv = ["fetch.py", "-o", out] + extra
    m.main()

if __name__ == "__main__":
    main()
