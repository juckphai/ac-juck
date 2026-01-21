// service-worker.js
// ปรับปรุงเป็น Offline 100% (ลบ Firebase ออกแล้ว)
const staticCacheName = 'account-app-static-v160'; // อัพเดทเวอร์ชันเป็น v160 เพื่อล้าง cache เก่า
const dynamicCacheName = 'account-app-dynamic-v160';

// ไฟล์ที่ต้อง cache ตั้งแต่ตอน install
const assets = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './script.js',
  './192.png',
  './512.png',

  // ไลบรารีภายนอก (เพื่อใช้งาน offline)
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
  
  // ❌ ลบ Firebase SDK ออกหมดแล้ว
];

// 1) INSTALL — cache ไฟล์ทั้งหมด
self.addEventListener('install', evt => {
  console.log('SW installing…');
  evt.waitUntil(
    caches.open(staticCacheName)
      .then(cache => cache.addAll(assets))
      .catch(err => console.error("CACHE ERROR:", err))
  );
  self.skipWaiting();
});

// 2) ACTIVATE — ลบ cache เก่า
self.addEventListener('activate', evt => {
  console.log('SW activated.');
  evt.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== staticCacheName && k !== dynamicCacheName)
            .map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// 3) FETCH — cache-first logic + dynamic cache
self.addEventListener('fetch', evt => {

  // ป้องกัน error จาก chrome-extension หรือ request แปลกๆ
  if (!evt.request.url.startsWith('http')) return;

  evt.respondWith(
    caches.match(evt.request).then(cacheRes => {
      if (cacheRes) {
        return cacheRes; // 👍 โหลดจาก cache ก่อน
      }

      // ถ้าไม่มีใน cache → ดึงจาก network
      return fetch(evt.request)
        .then(networkRes => {
          // cache เฉพาะ response ปกติ
          if (networkRes && networkRes.status === 200) {
            caches.open(dynamicCacheName).then(cache => {
              // ใช้ request ไม่ใช่ request.url (สำคัญ)
              cache.put(evt.request, networkRes.clone());
            });
          }
          return networkRes;
        })
        .catch(() => {
          // ถ้า offline และไม่มี cache → ส่ง index.html แทน (กรณีเข้าหน้าเว็บครั้งแรกตอนไม่มีเน็ต)
          if (evt.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});