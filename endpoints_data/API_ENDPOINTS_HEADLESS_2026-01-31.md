# API Endpoints (headless discovery)

- **Date**: 2026-01-31
- **Controller**: https://192.168.1.1
- **Total unique requests**: 31

---

## API (legacy)

- `POST /api/auth/login`
- `GET /api/cloud/backup/settings/list`
- `POST /api/controllers/checkUpdates`
- `GET /api/firmware/update`
- `GET /api/system`
- `GET /api/system/syslog/settings`
- `GET /api/users/self`

## Proxy /network API (v1)

- `GET /proxy/network/api/s/default/get/setting`
- `GET /proxy/network/api/s/default/rest/networkconf`
- `GET /proxy/network/api/s/default/rest/wlanconf`
- `GET /proxy/network/api/s/default/stat/device`
- `GET /proxy/network/api/s/default/stat/health`
- `GET /proxy/network/api/s/default/stat/widget/warnings`

## Proxy /network v2 API

- `GET /proxy/network/v2/api/fingerprint_devices/0`
- `GET /proxy/network/v2/api/info`
- `GET /proxy/network/v2/api/info?preferred_site_name=default`
- `GET /proxy/network/v2/api/site/default/aggregated-dashboard?historySeconds=86400`
- `GET /proxy/network/v2/api/site/default/apgroups`
- `GET /proxy/network/v2/api/site/default/clients/active?includeTrafficUsage=true&includeUnifiDevices=true`
- `GET /proxy/network/v2/api/site/default/described-features?includeSystemFeatures=true`
- `GET /proxy/network/v2/api/site/default/device-tags`
- `GET /proxy/network/v2/api/site/default/device?separateUnmanaged=true&includeTrafficUsage=true`
- `GET /proxy/network/v2/api/site/default/device/wireless-links`
- `GET /proxy/network/v2/api/site/default/models`
- `POST /proxy/network/v2/api/site/default/system-log/critical`
- `GET /proxy/network/v2/api/site/default/wan/enriched-configuration`
- `GET /proxy/network/v2/api/site/default/wan/networkgroups?uptime=true`
- `GET /proxy/network/v2/api/system/event/SETUP_COMPLETED/first`

## Proxy /users API

- `GET /proxy/users/api/v2/info`
- `GET /proxy/users/api/v2/user/self`
- `GET /proxy/users/api/v2/users/admin/uos?page_num=1&page_size=999`

---

## Sample request headers (first request)

```
accept: */*
```
