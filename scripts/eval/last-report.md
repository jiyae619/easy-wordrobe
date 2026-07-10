# Intake-model A/B eval

- Fixtures: `scripts/gen/out/flux2-iris`
- Nova model: `us.amazon.nova-2-lite-v1:0` (region `us-east-2`)
- Gemini model: `gemini-2.5-flash`
- Run at: 2026-06-26T20:37:58.178Z

### AWS Nova 2 Lite (200 fixtures)

| Metric | Value |
|---|---|
| Success rate (no error / no fallback) | 100.0% |
| Category accuracy | 85.5% |
| Subcategory keyword hit | 88.0% |
| Avg color score (0–1, higher = closer hex) | 0.758 |
| Avg color RGB distance (lower = closer) | 48.4 |
| Avg mood Jaccard | 0.514 |
| Avg season Jaccard | 0.711 |
| Avg latency (ms) | 1489 |

### Gemini gemini-2.5-flash (200 fixtures)

| Metric | Value |
|---|---|
| Success rate (no error / no fallback) | 99.5% |
| Category accuracy | 84.4% |
| Subcategory keyword hit | 87.9% |
| Avg color score (0–1, higher = closer hex) | 0.782 |
| Avg color RGB distance (lower = closer) | 43.7 |
| Avg mood Jaccard | 0.625 |
| Avg season Jaccard | 0.629 |
| Avg latency (ms) | 2685 |

### Per-fixture

| Fixture | Nova cat | Gemini cat | Nova color | Gemini color | Nova sub-hit | Gemini sub-hit | Nova ms | Gemini ms |
|---|---|---|---|---|---|---|---|---|
| bottoms-chinos-beige-s40802 | ✓ | ✓ | 47 | 54 | ✗ | ✗ | 1736 | 2826 |
| bottoms-chinos-black-s63971 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1289 | 2461 |
| bottoms-chinos-blue-s8750 | ✓ | ✓ | 33 | 50 | ✗ | ✗ | 1332 | 2913 |
| bottoms-chinos-brown-s1230 | ✓ | ✓ | 25 | 44 | ✓ | ✓ | 1196 | 3449 |
| bottoms-chinos-cream-s18286 | ✓ | ✓ | 23 | 42 | ✓ | ✓ | 1266 | 2718 |
| bottoms-chinos-grey-s48029 | ✓ | ✓ | 65 | 45 | ✓ | ✓ | 1198 | 2761 |
| bottoms-chinos-navy-s46052 | ✓ | ✓ | 66 | 60 | ✓ | ✓ | 1303 | 2857 |
| bottoms-chinos-olive-s42021 | ✓ | ✓ | 56 | 27 | ✓ | ✓ | 1466 | 3152 |
| bottoms-chinos-pink-s1464 | ✓ | ✓ | 47 | 95 | ✓ | ✓ | 1282 | 2792 |
| bottoms-chinos-white-s37735 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1329 | 2362 |
| bottoms-denim-shorts-beige-s56027 | ✓ | ✓ | 0 | 18 | ✓ | ✓ | 2207 | 2297 |
| bottoms-denim-shorts-black-s79196 | ✓ | ✓ | 0 | 66 | ✓ | ✓ | 1022 | 2236 |
| bottoms-denim-shorts-blue-s69703 | ✓ | ✓ | 161 | 42 | ✓ | ✓ | 1351 | 2560 |
| bottoms-denim-shorts-brown-s16455 | ✓ | ✓ | 25 | 21 | ✗ | ✓ | 1628 | 2059 |
| bottoms-denim-shorts-cream-s33511 | ✓ | ✓ | 23 | 33 | ✓ | ✓ | 1328 | 3176 |
| bottoms-denim-shorts-grey-s8982 | ✓ | ✓ | 65 | 99 | ✓ | ✓ | 1740 | 2367 |
| bottoms-denim-shorts-navy-s7005 | ✓ | ✓ | 36 | 27 | ✓ | ✓ | 1319 | 3178 |
| bottoms-denim-shorts-olive-s57246 | ✓ | ✓ | 56 | 31 | ✓ | ✓ | 1944 | 3274 |
| bottoms-denim-shorts-pink-s62417 | ✓ | ✓ | 119 | 110 | ✓ | ✓ | 1431 | 2767 |
| bottoms-denim-shorts-white-s52960 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1082 | 2034 |
| bottoms-pleated-skirt-beige-s27991 | ✓ | ✓ | 47 | 46 | ✓ | ✓ | 1388 | 2455 |
| bottoms-pleated-skirt-black-s51160 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1574 | 2114 |
| bottoms-pleated-skirt-blue-s39427 | ✓ | ✓ | 33 | 72 | ✓ | ✓ | 2183 | 3243 |
| bottoms-pleated-skirt-brown-s88419 | ✓ | ✓ | 30 | 33 | ✓ | ✓ | 1341 | 2551 |
| bottoms-pleated-skirt-cream-s38179 | ✓ | ✓ | 13 | 23 | ✓ | ✓ | 1594 | 2547 |
| bottoms-pleated-skirt-grey-s78706 | ✓ | ✓ | 65 | 24 | ✓ | ✓ | 1221 | 2628 |
| bottoms-pleated-skirt-navy-s76729 | ✓ | ✓ | 66 | 49 | ✓ | ✓ | 1429 | 2551 |
| bottoms-pleated-skirt-olive-s29210 | ✓ | ✓ | 56 | 10 | ✓ | ✓ | 1768 | 2423 |
| bottoms-pleated-skirt-pink-s32141 | ✓ | ✓ | 47 | 98 | ✓ | ✓ | 1392 | 2102 |
| bottoms-pleated-skirt-white-s24924 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1379 | 2208 |
| bottoms-slim-jeans-beige-s15793 | ✓ | ✓ | 0 | 54 | ✓ | ✗ | 2455 | 2870 |
| bottoms-slim-jeans-black-s38962 | ✓ | ✓ | 0 | 76 | ✓ | ✓ | 1226 | 2768 |
| bottoms-slim-jeans-blue-s15101 | ✓ | ✓ | 161 | 88 | ✓ | ✓ | 2042 | 3582 |
| bottoms-slim-jeans-brown-s76221 | ✓ | ✓ | 25 | 42 | ✓ | ✓ | 1751 | 2961 |
| bottoms-slim-jeans-cream-s93277 | ✓ | ✓ | 23 | 36 | ✗ | ✓ | 1451 | 3672 |
| bottoms-slim-jeans-grey-s54380 | ✓ | ✓ | 65 | 79 | ✓ | ✓ | 1019 | 2407 |
| bottoms-slim-jeans-navy-s52403 | ✓ | ✓ | 65 | 56 | ✓ | ✓ | 1475 | 3267 |
| bottoms-slim-jeans-olive-s17012 | ✓ | ✓ | 56 | 19 | ✓ | ✓ | 1385 | 3148 |
| bottoms-slim-jeans-pink-s7815 | ✓ | ✓ | 119 | 122 | ✓ | ✓ | 1290 | 2535 |
| bottoms-slim-jeans-white-s12726 | ✓ | ✓ | 0 | 0 | ✗ | ✓ | 1938 | 2623 |
| bottoms-trousers-beige-s20677 | ✓ | ✓ | 109 | 54 | ✓ | ✓ | 1253 | 2435 |
| bottoms-trousers-black-s43846 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 2475 | 2541 |
| bottoms-trousers-blue-s70385 | ✓ | ✓ | 33 | 80 | ✓ | ✓ | 1944 | 2732 |
| bottoms-trousers-brown-s81105 | ✓ | ✓ | 30 | 49 | ✓ | ✓ | 1365 | 2457 |
| bottoms-trousers-cream-s98161 | ✓ | ✓ | 23 | 23 | ✓ | ✓ | 1306 | 2909 |
| bottoms-trousers-grey-s9664 | ✓ | ✓ | 168 | 45 | ✓ | ✓ | 1362 | 2674 |
| bottoms-trousers-navy-s7687 | ✓ | ✓ | 66 | 60 | ✓ | ✓ | 2134 | 3181 |
| bottoms-trousers-olive-s21896 | ✓ | ✓ | 56 | 61 | ✓ | ✓ | 1313 | 3068 |
| bottoms-trousers-pink-s63099 | ✓ | ✓ | 47 | 70 | ✓ | ✓ | 1655 | 2822 |
| bottoms-trousers-white-s17610 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1303 | 3862 |
| dresses-shirt-dress-beige-s50375 | ✗ | ✗ | 47 | 66 | ✗ | ✗ | 1336 | 2406 |
| dresses-shirt-dress-black-s73544 | ✗ | ✗ | 0 | 0 | ✗ | ✗ | 1330 | 2252 |
| dresses-shirt-dress-blue-s25011 | ✗ | ✗ | 33 | 65 | ✗ | ✗ | 1879 | 2183 |
| dresses-shirt-dress-brown-s10803 | ✗ | ERR | 30 | — | ✗ | ✗ | 1876 | 5906 |
| dresses-shirt-dress-cream-s27859 | ✗ | ✗ | 23 | 28 | ✗ | ✗ | 1567 | 2931 |
| dresses-shirt-dress-grey-s64290 | ✗ | ✗ | 65 | 24 | ✗ | ✗ | 1268 | 2357 |
| dresses-shirt-dress-navy-s62313 | ✗ | ✗ | 66 | 66 | ✗ | ✗ | 1381 | 2971 |
| dresses-shirt-dress-olive-s18890 | ✗ | ✗ | 56 | 17 | ✗ | ✗ | 1456 | 2688 |
| dresses-shirt-dress-pink-s17725 | ✗ | ✗ | 119 | 85 | ✗ | ✗ | 1434 | 2150 |
| dresses-shirt-dress-white-s47308 | ✗ | ✗ | 0 | 0 | ✗ | ✗ | 1655 | 1959 |
| dresses-slip-dress-beige-s36853 | ✗ | ✗ | 88 | 72 | ✗ | ✗ | 1210 | 2241 |
| dresses-slip-dress-black-s60022 | ✗ | ✗ | 0 | 0 | ✗ | ✗ | 1433 | 4318 |
| dresses-slip-dress-blue-s51169 | ✓ | ✓ | 143 | 55 | ✓ | ✓ | 1619 | 2869 |
| dresses-slip-dress-brown-s97281 | ✓ | ✗ | 30 | 39 | ✓ | ✗ | 1026 | 2356 |
| dresses-slip-dress-cream-s14337 | ✓ | ✗ | 57 | 32 | ✓ | ✗ | 1649 | 1905 |
| dresses-slip-dress-grey-s90448 | ✓ | ✓ | 65 | 24 | ✓ | ✓ | 1254 | 3075 |
| dresses-slip-dress-navy-s88471 | ✓ | ✓ | 66 | 87 | ✓ | ✓ | 1376 | 3221 |
| dresses-slip-dress-olive-s38072 | ✗ | ✗ | 56 | 39 | ✗ | ✗ | 1194 | 2714 |
| dresses-slip-dress-pink-s43883 | ✓ | ✓ | 47 | 78 | ✓ | ✓ | 1527 | 3100 |
| dresses-slip-dress-white-s33786 | ✗ | ✗ | 0 | 0 | ✗ | ✗ | 3864 | 3112 |
| dresses-sundress-beige-s43238 | ✓ | ✗ | 109 | 81 | ✓ | ✗ | 1412 | 2645 |
| dresses-sundress-black-s66407 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1431 | 2533 |
| dresses-sundress-blue-s21650 | ✓ | ✓ | 33 | 43 | ✓ | ✓ | 1458 | 2665 |
| dresses-sundress-brown-s3666 | ✓ | ✓ | 25 | 67 | ✓ | ✓ | 1718 | 3035 |
| dresses-sundress-cream-s20722 | ✓ | ✓ | 13 | 23 | ✓ | ✓ | 2717 | 2590 |
| dresses-sundress-grey-s60929 | ✓ | ✓ | 65 | 24 | ✓ | ✓ | 1507 | 2469 |
| dresses-sundress-navy-s58952 | ✓ | ✓ | 66 | 65 | ✓ | ✓ | 3060 | 3179 |
| dresses-sundress-olive-s44457 | ✓ | ✗ | 56 | 27 | ✓ | ✗ | 1544 | 1832 |
| dresses-sundress-pink-s14364 | ✓ | ✗ | 47 | 61 | ✓ | ✗ | 1330 | 2151 |
| dresses-sundress-white-s40171 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1575 | 2204 |
| dresses-wrap-dress-beige-s16183 | ✓ | ✓ | 52 | 58 | ✓ | ✓ | 1339 | 2867 |
| dresses-wrap-dress-black-s39352 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1733 | 2772 |
| dresses-wrap-dress-blue-s15875 | ✓ | ✓ | 78 | 72 | ✓ | ✓ | 1212 | 3356 |
| dresses-wrap-dress-brown-s76611 | ✓ | ✓ | 30 | 32 | ✓ | ✓ | 1267 | 2982 |
| dresses-wrap-dress-cream-s93667 | ✓ | ✓ | 23 | 13 | ✓ | ✓ | 1523 | 3824 |
| dresses-wrap-dress-grey-s55154 | ✓ | ✓ | 65 | 24 | ✓ | ✓ | 938 | 3636 |
| dresses-wrap-dress-navy-s53177 | ✓ | ✓ | 66 | 60 | ✓ | ✓ | 1225 | 2563 |
| dresses-wrap-dress-olive-s17402 | ✓ | ✓ | 56 | 5 | ✓ | ✓ | 1287 | 2991 |
| dresses-wrap-dress-pink-s8589 | ✓ | ✓ | 47 | 95 | ✓ | ✓ | 1651 | 2671 |
| dresses-wrap-dress-white-s13116 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1226 | 3140 |
| outerwear-blazer-beige-s79252 | ✓ | ✓ | 109 | 48 | ✓ | ✓ | 2804 | 2253 |
| outerwear-blazer-black-s2421 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1238 | 2446 |
| outerwear-blazer-blue-s92896 | ✓ | ✓ | 33 | 80 | ✓ | ✓ | 1326 | 2870 |
| outerwear-blazer-brown-s39680 | ✓ | ✓ | 25 | 55 | ✓ | ✓ | 1328 | 2255 |
| outerwear-blazer-cream-s56736 | ✓ | ✓ | 23 | 32 | ✓ | ✓ | 2045 | 3251 |
| outerwear-blazer-grey-s32175 | ✓ | ✓ | 65 | 45 | ✓ | ✓ | 1347 | 2385 |
| outerwear-blazer-navy-s62902 | ✓ | ✓ | 66 | 60 | ✓ | ✓ | 1433 | 2230 |
| outerwear-blazer-olive-s80471 | ✓ | ✓ | 56 | 30 | ✓ | ✓ | 1213 | 2719 |
| outerwear-blazer-pink-s18314 | ✓ | ✓ | 119 | 119 | ✓ | ✓ | 2012 | 2975 |
| outerwear-blazer-white-s76185 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1219 | 2462 |
| outerwear-cardigan-beige-s67629 | ✗ | ✗ | 0 | 54 | ✓ | ✓ | 1328 | 2767 |
| outerwear-cardigan-black-s90798 | ✗ | ✗ | 0 | 0 | ✓ | ✓ | 1280 | 3147 |
| outerwear-cardigan-blue-s4665 | ✗ | ✗ | 33 | 56 | ✓ | ✓ | 1296 | 2568 |
| outerwear-cardigan-blue-v1-s4666 | ✗ | ✗ | 33 | 30 | ✓ | ✓ | 1431 | 3086 |
| outerwear-cardigan-brown-s28057 | ✗ | ✗ | 30 | 47 | ✓ | ✓ | 2101 | 3214 |
| outerwear-cardigan-cream-s45113 | ✗ | ✗ | 23 | 36 | ✓ | ✓ | 2644 | 2575 |
| outerwear-cardigan-grey-s43944 | ✗ | ✗ | 65 | 40 | ✓ | ✓ | 1122 | 3791 |
| outerwear-cardigan-grey-v1-s43945 | ✗ | ✗ | 65 | 24 | ✓ | ✓ | 1189 | 2371 |
| outerwear-cardigan-navy-s74671 | ✗ | ✗ | 66 | 72 | ✓ | ✓ | 2274 | 2358 |
| outerwear-cardigan-navy-v1-s74672 | ✗ | ✗ | 66 | 49 | ✓ | ✓ | 1163 | 2510 |
| outerwear-cardigan-olive-s68848 | ✗ | ✗ | 56 | 33 | ✓ | ✓ | 1239 | 2473 |
| outerwear-cardigan-pink-s30083 | ✗ | ✗ | 119 | 122 | ✓ | ✓ | 2038 | 3019 |
| outerwear-cardigan-pink-v1-s30084 | ✗ | ✗ | 47 | 85 | ✓ | ✓ | 1893 | 3143 |
| outerwear-cardigan-white-s64562 | ✗ | ✓ | 38 | 0 | ✓ | ✓ | 1052 | 2919 |
| outerwear-denim-jacket-beige-s70048 | ✓ | ✓ | 52 | 29 | ✓ | ✓ | 1938 | 2258 |
| outerwear-denim-jacket-black-s93217 | ✓ | ✓ | 0 | 45 | ✓ | ✓ | 1354 | 2389 |
| outerwear-denim-jacket-blue-s31020 | ✓ | ✓ | 33 | 107 | ✓ | ✓ | 1240 | 1932 |
| outerwear-denim-jacket-brown-s30476 | ✓ | ✓ | 25 | 27 | ✓ | ✓ | 1228 | 3683 |
| outerwear-denim-jacket-cream-s80236 | ✓ | ✓ | 23 | 34 | ✓ | ✓ | 1455 | 2629 |
| outerwear-denim-jacket-grey-s3003 | ✓ | ✓ | 65 | 109 | ✓ | ✓ | 1526 | 2276 |
| outerwear-denim-jacket-navy-s1026 | ✓ | ✓ | 0 | 37 | ✓ | ✓ | 1345 | 2642 |
| outerwear-denim-jacket-olive-s71267 | ✓ | ✓ | 56 | 59 | ✓ | ✓ | 1339 | 2256 |
| outerwear-denim-jacket-pink-s56438 | ✓ | ✓ | 119 | 119 | ✓ | ✓ | 1184 | 2601 |
| outerwear-denim-jacket-white-s99685 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1635 | 2151 |
| outerwear-puffer-parka-beige-s38552 | ✓ | ✓ | 109 | 54 | ✓ | ✓ | 1637 | 1820 |
| outerwear-puffer-parka-beige-v1-s38553 | ✓ | ✓ | 109 | 66 | ✓ | ✓ | 991 | 1738 |
| outerwear-puffer-parka-black-s61721 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1931 | 1637 |
| outerwear-puffer-parka-black-v1-s61722 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1098 | 2049 |
| outerwear-puffer-parka-blue-s14628 | ✓ | ✓ | 185 | 77 | ✓ | ✓ | 1432 | 2150 |
| outerwear-puffer-parka-brown-s98980 | ✓ | ✓ | 25 | 30 | ✓ | ✓ | 1331 | 2560 |
| outerwear-puffer-parka-brown-v1-s98981 | ✓ | ✓ | 25 | 75 | ✓ | ✓ | 1225 | 1893 |
| outerwear-puffer-parka-cream-s16036 | ✓ | ✓ | 13 | 44 | ✓ | ✓ | 1100 | 2541 |
| outerwear-puffer-parka-cream-v1-s16037 | ✓ | ✓ | 23 | 23 | ✓ | ✓ | 1327 | 2051 |
| outerwear-puffer-parka-grey-s53907 | ✓ | ✓ | 65 | 7 | ✓ | ✓ | 1044 | 2332 |
| outerwear-puffer-parka-navy-s51930 | ✓ | ✓ | 66 | 50 | ✓ | ✓ | 1232 | 2967 |
| outerwear-puffer-parka-olive-s39771 | ✓ | ✓ | 56 | 29 | ✗ | ✓ | 1242 | 2446 |
| outerwear-puffer-parka-olive-v1-s39772 | ✓ | ✓ | 56 | 48 | ✓ | ✓ | 1372 | 2722 |
| outerwear-puffer-parka-pink-s7342 | ✓ | ✓ | 131 | 154 | ✓ | ✓ | 1307 | 2587 |
| outerwear-puffer-parka-white-s35485 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1031 | 2451 |
| outerwear-puffer-parka-white-v1-s35486 | ✓ | ✓ | 38 | 0 | ✓ | ✓ | 1377 | 1691 |
| outerwear-wool-coat-beige-s40425 | ✓ | ✓ | 109 | 50 | ✓ | ✗ | 1452 | 3165 |
| outerwear-wool-coat-black-s63594 | ✓ | ✓ | 0 | 65 | ✓ | ✓ | 1295 | 2482 |
| outerwear-wool-coat-blue-s57109 | ✓ | ✓ | 185 | 94 | ✓ | ✓ | 1850 | 2475 |
| outerwear-wool-coat-brown-s100853 | ✓ | ✓ | 25 | 23 | ✓ | ✓ | 1164 | 2853 |
| outerwear-wool-coat-cream-s50613 | ✓ | ✓ | 23 | 23 | ✓ | ✓ | 1384 | 2560 |
| outerwear-wool-coat-grey-s96388 | ✓ | ✓ | 65 | 80 | ✓ | ✓ | 1228 | 1947 |
| outerwear-wool-coat-navy-s94411 | ✓ | ✓ | 66 | 66 | ✓ | ✓ | 1007 | 2682 |
| outerwear-wool-coat-olive-s41644 | ✓ | ✓ | 56 | 23 | ✓ | ✓ | 1224 | 2294 |
| outerwear-wool-coat-pink-s49823 | ✓ | ✓ | 47 | 101 | ✓ | ✓ | 1394 | 3278 |
| outerwear-wool-coat-white-s70062 | ✓ | ✓ | 0 | 12 | ✗ | ✗ | 1251 | 3265 |
| tops-button-down-beige-s22525 | ✓ | ✓ | 109 | 60 | ✓ | ✓ | 1188 | 3209 |
| tops-button-down-black-s45694 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1367 | 2731 |
| tops-button-down-blue-s41129 | ✓ | ✓ | 33 | 30 | ✓ | ✓ | 1466 | 2618 |
| tops-button-down-brown-s82953 | ✓ | ✓ | 25 | 55 | ✓ | ✓ | 1336 | 4519 |
| tops-button-down-cream-s100009 | ✓ | ✓ | 23 | 39 | ✓ | ✓ | 1622 | 3075 |
| tops-button-down-grey-s80408 | ✓ | ✓ | 65 | 45 | ✓ | ✓ | 1536 | 2666 |
| tops-button-down-navy-s78431 | ✓ | ✓ | 66 | 63 | ✓ | ✓ | 1325 | 2613 |
| tops-button-down-olive-s91040 | ✓ | ✓ | 56 | 43 | ✓ | ✓ | 1790 | 2664 |
| tops-button-down-pink-s33843 | ✓ | ✓ | 119 | 118 | ✓ | ✓ | 1533 | 3181 |
| tops-button-down-white-s19458 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1531 | 2497 |
| tops-crew-tee-beige-s18776 | ✓ | ✓ | 109 | 48 | ✓ | ✓ | 1498 | 2931 |
| tops-crew-tee-black-s74649 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1675 | 2459 |
| tops-crew-tee-blue-s74692 | ✓ | ✓ | 143 | 49 | ✓ | ✓ | 2865 | 2457 |
| tops-crew-tee-brown-s11908 | ✓ | ✓ | 25 | 29 | ✓ | ✓ | 1432 | 2356 |
| tops-crew-tee-cream-s28964 | ✓ | ✓ | 23 | 42 | ✓ | ✓ | 1351 | 2374 |
| tops-crew-tee-grey-s13971 | ✓ | ✓ | 65 | 24 | ✓ | ✓ | 1047 | 2081 |
| tops-crew-tee-navy-s11994 | ✓ | ✓ | 66 | 69 | ✓ | ✓ | 1337 | 2292 |
| tops-crew-tee-olive-s19995 | ✓ | ✓ | 56 | 47 | ✓ | ✓ | 1495 | 2422 |
| tops-crew-tee-pink-s67406 | ✓ | ✓ | 47 | 74 | ✓ | ✓ | 1366 | 2871 |
| tops-crew-tee-white-s48413 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1330 | 2078 |
| tops-hoodie-beige-s84244 | ✓ | ✓ | 109 | 60 | ✓ | ✓ | 4142 | 2486 |
| tops-hoodie-black-s7413 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1326 | 2206 |
| tops-hoodie-blue-s63392 | ✓ | ✓ | 143 | 84 | ✓ | ✓ | 1380 | 1879 |
| tops-hoodie-brown-s44672 | ✓ | ✓ | 25 | 43 | ✓ | ✓ | 1349 | 2027 |
| tops-hoodie-cream-s61728 | ✓ | ✓ | 23 | 39 | ✓ | ✓ | 1196 | 1871 |
| tops-hoodie-grey-s2671 | ✓ | ✓ | 65 | 24 | ✓ | ✓ | 1299 | 2255 |
| tops-hoodie-navy-s100694 | ✓ | ✓ | 66 | 65 | ✓ | ✓ | 1222 | 3006 |
| tops-hoodie-olive-s85463 | ✓ | ✓ | 56 | 41 | ✓ | ✓ | 1057 | 2708 |
| tops-hoodie-pink-s56106 | ✓ | ✓ | 119 | 115 | ✓ | ✓ | 1381 | 2394 |
| tops-hoodie-white-s81177 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1360 | 2130 |
| tops-knit-sweater-beige-s81754 | ✓ | ✓ | 109 | 76 | ✓ | ✓ | 1330 | 2396 |
| tops-knit-sweater-black-s4923 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 1396 | 3274 |
| tops-knit-sweater-blue-s45478 | ✓ | ✓ | 33 | 71 | ✓ | ✓ | 1330 | 2561 |
| tops-knit-sweater-brown-s42182 | ✓ | ✓ | 30 | 35 | ✓ | ✓ | 1639 | 1944 |
| tops-knit-sweater-cream-s59238 | ✓ | ✓ | 23 | 39 | ✓ | ✓ | 1329 | 3792 |
| tops-knit-sweater-grey-s84757 | ✓ | ✓ | 65 | 16 | ✓ | ✓ | 1113 | 2109 |
| tops-knit-sweater-navy-s82780 | ✓ | ✓ | 66 | 60 | ✓ | ✓ | 1192 | 2385 |
| tops-knit-sweater-olive-s82973 | ✓ | ✓ | 56 | 21 | ✓ | ✓ | 1083 | 2650 |
| tops-knit-sweater-pink-s70896 | ✓ | ✓ | 47 | 71 | ✓ | ✓ | 1417 | 4017 |
| tops-knit-sweater-white-s78687 | ✓ | ✓ | 0 | 12 | ✓ | ✓ | 1746 | 2658 |
| tops-silk-blouse-beige-s14310 | ✗ | ✓ | 87 | 43 | ✗ | ✓ | 1122 | 2795 |
| tops-silk-blouse-black-s37479 | ✓ | ✓ | 0 | 0 | ✓ | ✓ | 2326 | 2969 |
| tops-silk-blouse-blue-s7890 | ✓ | ✓ | 143 | 55 | ✓ | ✓ | 1332 | 3385 |
| tops-silk-blouse-brown-s74738 | ✓ | ✓ | 30 | 38 | ✗ | ✓ | 1234 | 3267 |
| tops-silk-blouse-cream-s91794 | ✓ | ✓ | 23 | 28 | ✓ | ✓ | 1329 | 2919 |
| tops-silk-blouse-grey-s47169 | ✓ | ✓ | 49 | 65 | ✓ | ✓ | 1386 | 3159 |
| tops-silk-blouse-navy-s45192 | ✓ | ✓ | 66 | 65 | ✓ | ✓ | 1086 | 2406 |
| tops-silk-blouse-olive-s15529 | ✓ | ✓ | 56 | 35 | ✓ | ✓ | 1295 | 2606 |
| tops-silk-blouse-pink-s100604 | ✓ | ✓ | 119 | 15 | ✓ | ✗ | 1341 | 2437 |
| tops-silk-blouse-white-s11243 | ✓ | ✓ | 0 | 0 | ✗ | ✓ | 1434 | 2598 |


## How to read this

- **Category accuracy** — most important; if a model can't tell tops from bottoms, nothing else matters.
- **Color score** — `1.0` is identical hex; `0.5` ≈ 100 RGB units off (noticeable but related shade); `0.0` ≈ unrelated color.
- **Subcategory hit** — binary keyword match. Looser than category, looks for any of the ground-truth keywords in the model's free-text subcategory.
- **Latency** — wall-clock including network. Different regions/keys will skew this.
