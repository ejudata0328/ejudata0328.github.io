# -*- coding: utf-8 -*-
"""
sitemap.xml 의 lastmod 를 실제 파일 변경일 기준으로 갱신한다.

- <loc> 의 경로에 해당하는 로컬 HTML 파일의 mtime 을 lastmod 로 기록
- AI뉴스 · FAQ100 등 데이터 기반 페이지는 참조하는 JSON 파일의 mtime 도 함께 비교하여 더 최근 날짜 사용
- GitHub Actions(AI뉴스 자동 크롤링) 에서 매일 호출되어 sitemap 최신성을 유지

사용: python scripts/update_sitemap_lastmod.py
"""
import io
import os
import re
import datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITEMAP = os.path.join(BASE, 'sitemap.xml')

# 데이터 파일에 의존하는 페이지 → 함께 비교할 JSON 목록
DATA_DEPS = {
    'community-ainews.html': ['data/ainews.json'],
    'community-faq100.html': ['data/faq_top100.json'],
    'community.html': ['data/community-notice.json'],
    'community-news.html': ['data/community-news.json'],
    'datacenter.html': ['data/datacenter-promotion.json'],
    'datacenter-etc.html': ['data/datacenter-etc.json'],
    'datacenter-product.html': [
        'data/product-rfid-asset.json', 'data/product-contract.json',
        'data/product-material.json', 'data/product-public-property.json',
        'data/product-vat.json', 'data/product-consumables.json',
        'data/product-print-cost.json', 'data/product-vehicle.json',
    ],
}


def mtime_date(relpath):
    """저장소 상대경로의 수정일(date)을 반환. 없으면 None."""
    full = os.path.join(BASE, relpath.replace('/', os.sep))
    if not os.path.isfile(full):
        return None
    return datetime.date.fromtimestamp(os.path.getmtime(full))


def page_date(fname):
    """페이지 파일 + 의존 데이터 파일 중 가장 최근 날짜."""
    dates = [d for d in [mtime_date(fname)] if d]
    for dep in DATA_DEPS.get(fname, []):
        d = mtime_date(dep)
        if d:
            dates.append(d)
    return max(dates) if dates else None


URL_RE = re.compile(
    r'(<loc>https://www\.ejudata\.co\.kr/([^<]*)</loc>\s*<lastmod>)(\d{4}-\d{2}-\d{2})(</lastmod>)',
    re.S)


def main():
    s = io.open(SITEMAP, encoding='utf-8').read()
    changed = []

    def repl(m):
        head, path, old, tail = m.group(1), m.group(2), m.group(3), m.group(4)
        fname = path if path else 'index.html'
        new = page_date(fname)
        if new is None:
            return m.group(0)
        new_s = new.isoformat()
        if new_s != old:
            changed.append('%s: %s -> %s' % (fname, old, new_s))
        return head + new_s + tail

    out = URL_RE.sub(repl, s)

    if out != s:
        io.open(SITEMAP, 'w', encoding='utf-8', newline='').write(out)
        print('sitemap.xml lastmod 갱신 (%d건)' % len(changed))
        for c in changed:
            print('  -', c)
    else:
        print('sitemap.xml 변경사항 없음')


if __name__ == '__main__':
    main()
