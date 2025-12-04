QuakeSense Lite — Ultimate Starter (Web + Android-ready)
---------------------------------------------------------

What you get:
- index.html  -> Web version (map + list + filters)
- android.html -> Android-oriented page (city selector + radius alerts)
- script.js   -> Shared logic (fetches USGS feed, renders map, handles alerts)
- style.css   -> Styling
- manifest.json -> PWA manifest (installable)
- sw.js       -> Service worker (caches app shell for offline use)
- cities.json -> Small list of cities with coordinates
- alert.wav   -> Short alert sound (1s beep)
- README.md   -> This file

How to run (web):
1. Unzip the folder and open index.html in any modern browser (Chrome/Firefox/Edge).
2. The app will fetch USGS earthquake data and display markers on the map.
3. Use the controls to change magnitude filter and feed type. The page auto-refreshes every 2 minutes.

How to run (Android-style page):
1. Open android.html in a browser on your phone, or wrap the folder with Capacitor to make an APK.
2. Select your city and click 'Set City' — you will receive an alert (sound + text) when a new quake occurs within the set radius.

Make it installable (PWA):
1. Open index.html in Chrome and use the browser menu to 'Install' or use the install button if shown.
2. The service worker will cache the app shell for basic offline availability.

Notes & tips:
- This project uses the free USGS public feeds: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- The alert sound may be blocked by browsers until the user interacts with the page. Tap the page once to enable audio on mobile.
- If you plan to wrap for Android with Capacitor, copy the files into the www/ folder of a Capacitor app and build normally.

License: Use freely for educational and STEAM project purposes.
