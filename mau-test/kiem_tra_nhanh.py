#!/usr/bin/env python3
"""Kiểm tra nhanh kết nối khoá API ↔ datngop-be, TRƯỚC khi thử với Claude/GPT. Chỉ đọc + chạy thử: KHÔNG ghi dữ liệu.

    DATNGOP_API_KEY=dnk_... python3 kiem_tra_nhanh.py            # production (https://api.datngop.com/api)
    DATNGOP_API_URL=http://localhost:4000/api DATNGOP_API_KEY=dnk_... python3 kiem_tra_nhanh.py

Khoá cần phạm vi tra_cuu + nhap_bai_dang (bước 7 chỉ CHẠY THỬ). Thoát mã 0 nếu mọi bước đạt, 1 nếu có bước lỗi.
Không cần thư viện ngoài (chỉ stdlib). Khoá không bao giờ được in ra.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

URL = os.environ.get("DATNGOP_API_URL", "https://api.datngop.com/api").rstrip("/")
KHOA = os.environ.get("DATNGOP_API_KEY", "").strip()
MAU = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tsss-pham-the-hien.json")
KET_QUA = []


def goi(method, duong_dan, query=None, body=None, khoa=None):
    """Trả (status, json|None). Không ném lỗi HTTP."""
    url = URL + duong_dan + ("?" + urllib.parse.urlencode(query) if query else "")
    headers = {"x-khoa-api": KHOA if khoa is None else khoa, "accept": "application/json"}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["content-type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode("utf-8") or "null")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, None
    except Exception as e:  # mạng
        return 0, {"error": f"không kết nối được: {type(e).__name__}"}


def buoc(ten, dat, chi_tiet=""):
    KET_QUA.append(dat)
    print(f"[{'ĐẠT' if dat else 'LỖI'}] {ten}" + (f" — {chi_tiet}" if chi_tiet else ""))
    return dat


def main():
    if not KHOA.startswith("dnk_"):
        print("Thiếu DATNGOP_API_KEY (khoá bắt đầu bằng dnk_)")
        return 1
    if not URL.startswith("https://") and "localhost" not in URL and "127.0.0.1" not in URL:
        print("DATNGOP_API_URL phải là https (chỉ localhost mới dùng http)")
        return 1
    mau = json.load(open(MAU, encoding="utf-8"))
    mong = mau["ketQuaMongDoi"]
    print(f"API: {URL}\n")

    # 1. phân loại đường (trừ 0,5m)
    s, j = goi("GET", "/bat-dong-san/ai-tsss/loai-duong", {"doRong": 3})
    d = (j or {}).get("data") or {}
    buoc("1. phan_loai_duong: hẻm 3m → 2,5m → nhóm 2–3m", s == 200 and d.get("doRongSauKhiTru") == 2.5 and ">=2m - <3m" in str(d.get("loaiDuong")), f"HTTP {s}")

    # 2. danh mục
    s, j = goi("GET", "/bat-dong-san/ai-tsss/tham-chieu", {"q": "binh dong"})
    tc = (j or {}).get("data") or {}
    ten_dat = [x.get("ten") for x in tc.get("loaiDats", [])]
    buoc("2. tham_chieu_danh_muc: có loại đất 'Đất thổ cư' + tìm được phường 'Bình Đông'",
         s == 200 and "Đất thổ cư" in ten_dat and bool((tc.get("phuongXas") or {}).get("ketQuaTim")), f"HTTP {s}")

    # 3. địa chỉ
    s, j = goi("GET", "/bat-dong-san/ai-tsss/dia-chi", {"lat": 10.728, "lng": 106.638})
    dc = (j or {}).get("data") or {}
    buoc("3. tra_dia_chi: toạ độ 10.728,106.638 có phường mới", s == 200 and bool(dc.get("moi")), f"HTTP {s}; {dc.get('moi')}")

    # 4. giá Nhà nước
    s, j = goi("GET", "/bat-dong-san/ai-tsss/gia-nha-nuoc", {"lat": 10.728, "lng": 106.638, "banKinhM": 500})
    gn = (j or {}).get("data") or {}
    buoc("4. tra_gia_nha_nuoc: trả danh sách mốc (có thể rỗng nếu khu vực chưa có dữ liệu)", s == 200 and "moc" in gn, f"HTTP {s}; {gn.get('tong')} mốc")

    # 5. kiểm tra TSSS với bộ mẫu có đáp án
    s, j = goi("POST", "/bat-dong-san/ai-tsss/kiem-tra-tsss", body={"tstd": mau["tstd"], "tsss": mau["tsss"], "ngayThamChieu": "2026-09-27"})
    kq = (j or {}).get("data") or {}
    giu = sorted(k["ma"] for k in kq.get("tsss", []) if k.get("trangThai") == "GIU")
    don_gia_ok = all(
        abs((next((k for k in kq.get("tsss", []) if k["ma"] == ma), {}).get("donGiaDat") or -10**9) - dg) <= 1
        for ma, dg in mong["donGiaDat"].items()
    )
    tv = (kq.get("thamChieu") or {}).get("trungVi")
    buoc("5. kiem_tra_tsss (bộ mẫu Phạm Thế Hiển): GIỮ đúng B,C,D,E,G · đơn giá gốc đúng · trung vị đúng",
         s == 200 and giu == sorted(mong["giu"]) and don_gia_ok and tv == mong["trungVi"], f"HTTP {s}; giữ={giu}; trung vị={tv}")

    # 6. chạy thử nhập (KHÔNG ghi)
    nhan_tin = next((x["nhan"] for x in tc.get("loaiTins", []) if x.get("ma") == "tsol"), None)
    phap_ly = next((p for p in tc.get("phapLys", []) if "Sổ Hồng Riêng" in p), (tc.get("phapLys") or [None])[0])
    dong = {
        "Loại tin *": nhan_tin, "Tiêu đề": "TEST - kiem_tra_nhanh",
        "Địa chỉ *": "Nhà hẻm 3m Phạm Thế Hiển, Phường 7 (cũ), Quận 8",
        "Vĩ độ *": 10.728, "Kinh độ *": 106.638, "Giá bán (đ)": 3600000000, "Diện tích đất (m²) *": 41.8,
        "Loại đất *": "Đất thổ cư", "Loại đường *": mong["loaiDuongDungCuaTin"]["D"], "Pháp lý *": phap_ly,
    }
    s, j = goi("POST", "/bat-dong-san/bai-dang/import", body={"rows": [dong], "kiemTra": True})
    r = (j or {}).get("data") or {}
    buoc("6. nhập CHẠY THỬ (kiemTra=true): không ghi, trả dauVan",
         s == 200 and r.get("kiemTra") is True and bool(r.get("dauVan")), f"HTTP {s}; hopLe={r.get('hopLe')}; lỗi={r.get('errors')}")

    # 7. nhập thật thiếu dauVan phải bị chặn
    s, j = goi("POST", "/bat-dong-san/bai-dang/import", body={"rows": [dong]})
    buoc("7. nhập thật KHÔNG có dauVan → bị chặn 400", s == 400, f"HTTP {s}; {(j or {}).get('error')}")

    # 8. quyền tối thiểu: các route sửa/xoá/duyệt phải 403 (guard từ chối TRƯỚC khi chạy handler)
    for ten, method, duong in [
        ("xoá bài đăng", "DELETE", "/bat-dong-san/bai-dang/khong-ton-tai"),
        ("duyệt bài đăng", "PATCH", "/bat-dong-san/bai-dang/khong-ton-tai/duyet"),
        ("liệt kê khoá API", "GET", "/he-thong/khoa-api"),
    ]:
        s, j = goi(method, duong)
        buoc(f"8. khoá API KHÔNG làm được '{ten}' → 403", s == 403, f"HTTP {s}")

    # 9. khoá sai
    s, j = goi("GET", "/bat-dong-san/ai-tsss/tham-chieu", khoa="dnk_" + "0" * 43)
    buoc("9. khoá sai → 401", s == 401, f"HTTP {s}")

    ok = all(KET_QUA)
    print(f"\n{'TẤT CẢ ĐẠT' if ok else 'CÓ BƯỚC LỖI'} ({sum(KET_QUA)}/{len(KET_QUA)})")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
